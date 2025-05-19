import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import Plan from '../Models/Plan.js';
import User from '../Models/User.js'; // assuming user model for subscription update
import { randomUUID } from 'crypto';


// Init PhonePe SDK client
const client = StandardCheckoutClient.getInstance(
  "TEST-M22HFU8UDDBYR_25051", // Merchant ID
  "MjcxNTAxYjAtZjA1Ny00YmQwLTg3YTktMGIyOTNmMjIzNmMz", // Salt Key
  1, // Salt Index
  Env.SANDBOX // or Env.PROD
);

export const payWithPhonePe = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const amount = plan.offerPrice * 100; // in paise
    const merchantOrderId = `txn_${randomUUID()}`;
    const redirectUrl = "http://localhost:3000/payment/phonepe-success";

    // Build payment request using SDK
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .build();

    // Send payment request
    const response = await client.pay(request);

    // Send result to mobile app / frontend
    res.status(200).json({
      success: true,
      message: "Payment initiated",
      redirectUrl: response.redirectUrl,
      merchantOrderId,
      amount,
      planName: plan.name,
      currency: "INR",
    });

  } catch (error) {
    console.error("PhonePe SDK error:", error);
    res.status(500).json({
      success: false,
      message: "PhonePe payment error",
      error: error.message,
    });
  }
};

// ✅ 2. Handle Payment Callback
export const phonePeCallbackHandler = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("📥 Callback received from PhonePe:", JSON.stringify(callbackData, null, 2));

    const { merchantOrderId, transactionId, state } = callbackData.payload || {};

    if (!merchantOrderId || !transactionId) {
      return res.status(400).json({ message: "Missing required fields in callback" });
    }

    // Extract userId from merchantOrderId (e.g., "txn_1694943091_<userId>")
    const userId = merchantOrderId.split('_').pop();

    if (state === "COMPLETED") {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Assume plan info was saved earlier — you can improve this by tracking pending orders
      const plan = await Plan.findOne(); // Fallback if no specific plan saved

      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const newSubscribedPlan = {
        planId: plan._id,
        name: plan.name,
        originalPrice: plan.originalPrice,
        offerPrice: plan.offerPrice,
        discountPercentage: plan.discountPercentage,
        duration: plan.duration,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year
        transactionId,
      };

      user.subscribedPlans.push(newSubscribedPlan);
      await user.save();

      console.log("✅ Subscription activated for user:", userId);
    } else {
      console.log("❌ Payment failed or cancelled for transaction:", transactionId);
    }

    res.status(200).json({ message: "Callback handled successfully" });
  } catch (error) {
    console.error("❌ Error handling callback:", error.message);
    res.status(500).json({ message: "Callback handling failed" });
  }
};


export const checkPhonePeStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;

    const response = await client.getOrderStatus(merchantOrderId);
    res.status(200).json({
      success: true,
      orderId: merchantOrderId,
      state: response.state, // 'COMPLETED', 'FAILED', etc.
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking payment status",
      error: error.message,
    });
  }
};
