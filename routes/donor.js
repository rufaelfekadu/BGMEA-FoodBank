const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { rekognition, s3 } = require('../utils/awsUtils'); // Replace with your file path
const fs = require('fs');

// Multer configuration for file upload
const upload = multer({ dest: 'uploads/' });


router.get("/donor/dashboard", middleware.ensureDonorLoggedIn, async (req,res) => {
	const donorId = req.user._id;
	const numPendingDonations = await Donation.countDocuments({ donor: donorId, status: "pending" });
	const numAcceptedDonations = await Donation.countDocuments({ donor: donorId, status: "accepted" });
	const numAssignedDonations = await Donation.countDocuments({ donor: donorId, status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ donor: donorId, status: "collected" });
	res.render("donor/dashboard", {
		title: "Dashboard",
		numPendingDonations, numAcceptedDonations, numAssignedDonations, numCollectedDonations
	});
});

router.get("/donor/donate", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/donate", { title: "Donate" });
});

router.post("/donor/donate", middleware.ensureDonorLoggedIn, upload.single('donationImage'), async (req, res) => {
	try {
	  let status = "pending";
	  let image_name = null;
	  let agentId = null;
  
	  const image = req.file; // Uploaded image file
  
	  if (!image) {
		// No image uploaded, handle accordingly
		console.log("No image uploaded");
	  } else {
		const imagePath = image.path;
		const imageBuffer = fs.readFileSync(imagePath);
  
		// Upload image to S3
		const key = `assets/donation-images/${uuidv4()}-${image.originalname}`;
		const s3Params = {
		  Bucket: 'staticfile-store',
		  Key: key,
		  Body: imageBuffer,
		  ACL: 'public-read', // Adjust permissions as needed
		};
		const s3UploadResponse = await s3.upload(s3Params).promise();
		image_name = s3UploadResponse.Location;
  
		// Process image using AWS Rekognition
		const rekognitionParams = {
		  Image: {
			Bytes: imageBuffer,
		  },
		  MinConfidence: 90,
		  ProjectVersionArn: process.env.PROJECT_VERSION_ARN,
		};
		const rekognitionResponse = await rekognition.detectCustomLabels(rekognitionParams).promise();
		const healthfoods = ["freshapples", "freshbananas", "freshoranges"];
  
		if (
		  rekognitionResponse.CustomLabels.length === 0 ||
		  rekognitionResponse.CustomLabels[0].Confidence < 80
		) {
		  status = "pending";
		  req.flash("warning", "Donation request sent for further inspection");
		} 
		else if (healthfoods.includes(rekognitionResponse.CustomLabels[0].Name)) {

			status = "accepted";
			// req.flash("success", "Donation request sent successfully. Assigning an agent to collect the donation.");
  
		//   // logic to assign agent
		//   const agents = await User.find({ role: "agent" });
		//   const agent = agents[Math.floor(Math.random() * agents.length)];

			// Logic to find an available, unassigned agent
			const assignedAgents = await Donation.find({ agent: { $ne: null } }).distinct('agent');
			const availableAgents = await User.find({ role: "agent", _id: { $nin: assignedAgents } });

			if (availableAgents.length === 0) {
				// No available agents found
				status = "accepted";
				req.flash("error", "No agent available to collect the donation at this time. The admin will assign an agent soon.");
			} else {
				// Assign an available agent
				const randomIndex = Math.floor(Math.random() * availableAgents.length);
				const agent = availableAgents[randomIndex];
				status = "assigned";
				agentId = agent._id;
			}
  
		//   if (!agent) {
		// 	status = "accepted";
		// 	req.flash("error", "No agent available to collect the donation at this time. The admin will assign an agent soon.");
		//   } else {
		// 	status = "assigned";
		// 	agentId = agent._id;
		//   }
		} else {
		  status = "rejected";
		  req.flash("error", "Donation request rejected. Please donate only healthy food items.");
		}
	  }
  
	  const donation = {
		...req.body.donation,
		status: status,
		image: image_name,
		agent: agentId,
		donor: req.user._id,
	  };
  
	  const newDonation = new Donation(donation);
	  await newDonation.save();
	  res.redirect("/donor/donations/pending");
	} catch (err) {
	  console.log(err);
	  req.flash("error", "Some error occurred on the server.");
	  res.redirect("back");
	}
  });
  

router.get("/donor/donations/pending", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({ donor: req.user._id, status: ["pending", "rejected", "accepted", "assigned"] }).populate("agent");
		res.render("donor/pendingDonations", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donations/previous", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ donor: req.user._id, status: "collected" }).populate("agent");
		res.render("donor/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donation/deleteRejected/:donationId", async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndDelete(donationId);
		res.redirect("/donor/donations/pending");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/profile", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/profile", { title: "My Profile" });
});

router.put("/donor/profile", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.donor;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id).then(updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/donor/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});


module.exports = router;