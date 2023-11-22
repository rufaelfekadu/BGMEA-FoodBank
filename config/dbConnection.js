const mongoose = require("mongoose");
const awsUtils = require('../utils/awsUtils'); // Replace with your file path


const connectDB = async() => {
	try{
	
	// get connection uri from aws parameter store and wait for it to be retrieved
	const value = await awsUtils.getParameter('atlas-db-uri')
	console.log('Retrieved value:', value);
	await mongoose.connect(value);
	console.log("MongoDB connected...");
	}catch(err){
		console.log(err);
		process.exit(1);
	}
	
}

module.exports = connectDB;