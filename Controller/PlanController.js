import Plan from '../Models/Plan.js';

// Controller to create a new plan
export const createPlan = async (req, res) => {
  try {
    const { name, originalPrice, offerPrice, discountPercentage, features, duration } = req.body;

    const plan = new Plan({
      name,
      originalPrice,
      offerPrice,
      discountPercentage,
      features,
      duration
    });

    await plan.save();
    res.status(201).json({ message: "Plan created successfully", plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating plan" });
  }
};

// Controller to update the plan
export const updatePlan = async (req, res) => {
  try {
    const { name, originalPrice, offerPrice, discountPercentage, features } = req.body;

    if (!name || !originalPrice || !offerPrice || !discountPercentage || !features) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const plan = await Plan.findOne(); // Assuming only one plan exists
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    plan.name = name;
    plan.originalPrice = originalPrice;
    plan.offerPrice = offerPrice;
    plan.discountPercentage = discountPercentage;
    plan.features = features;

    await plan.save();
    res.status(200).json({ message: "Plan updated successfully", plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating plan" });
  }
};

// Controller to delete a plan
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOne(); // Assuming only one plan exists
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    await plan.deleteOne();
    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting plan" });
  }
};

// Controller to add a feature to the plan
export const addFeature = async (req, res) => {
  try {
    const { feature } = req.body;

    if (!feature) {
      return res.status(400).json({ message: "Feature is required" });
    }

    const plan = await Plan.findOne(); // Assuming only one plan exists
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    plan.features.push(feature);
    await plan.save();

    res.status(200).json({ message: "Feature added successfully", plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding feature" });
  }
};

// Controller to remove a feature from the plan
export const removeFeature = async (req, res) => {
  try {
    const { feature } = req.body;

    if (!feature) {
      return res.status(400).json({ message: "Feature is required" });
    }

    const plan = await Plan.findOne(); // Assuming only one plan exists
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const featureIndex = plan.features.indexOf(feature);
    if (featureIndex > -1) {
      plan.features.splice(featureIndex, 1);
      await plan.save();
      res.status(200).json({ message: "Feature removed successfully", plan });
    } else {
      res.status(400).json({ message: "Feature not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing feature" });
  }
};


// Controller to get all plans
export const getAllPlans = async (req, res) => {
    try {
      const plans = await Plan.find().sort({ createdAt: -1 }); // Latest plans first
      res.status(200).json({ message: "Plans fetched successfully", plans });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching plans" });
    }
  };
  
  // Controller to get a single plan by ID
  export const getSinglePlan = async (req, res) => {
    try {
      const { id } = req.params;
  
      const plan = await Plan.findById(id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
  
      res.status(200).json({ message: "Plan fetched successfully", plan });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching plan" });
    }
  };
  
