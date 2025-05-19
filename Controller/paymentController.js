import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import Plan from '../Models/Plan.js';
import User from '../Models/User.js'; // assuming user model for subscription update
import { randomUUID } from 'crypto';


// PhonePe Sandbox Credentials
const clientId = "TEST-M22HFU8UDDBYR_25051";
const clientSecret = "MjcxNTAxYjAtZjA1Ny00YmQwLTg3YTktMGIyOTNmMjIzNmMz";
const clientVersion = 1;
const env = Env.SANDBOX;

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);


export const payWithPhonePe = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    // Get plan
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const amount = plan.offerPrice * 100; // in paise
    const redirectUrl = "http://localhost:3000/payment/phonepe-success";  // Can be any dummy for now
    const merchantOrderId = `txn_${Date.now()}_${userId}`;

    // Build payment request
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .build();

    const response = await client.pay(request); // Send request to PhonePe

    // Respond back to Flutter app
    res.status(200).json({
      success: true,
      message: "Payment initiated",
      redirectUrl: response.redirectUrl,      // Flutter will open this in WebView or browser
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
