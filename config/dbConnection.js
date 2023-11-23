const mongoose = require("mongoose");
const awsUtils = require('../utils/awsUtils'); // Replace with your file path


const connectDB = async() => {
	try{
	
	// get connection uri from aws parameter store and wait for it to be retrieved
	// const value = await awsUtils.getParameter('Database-uri-store')
	const value = "mongodb+srv://foodbank:FBzJw3kPGM7yW1a4@cluster0.ytm1wfy.mongodb.net/?retryWrites=true&w=majority";

	// const value = "mongodb://User4:zerowastenomads@docdb-2023-11-22-17-01-20.cj4ax3bxarjc.us-east-1.docdb.amazonaws.com:27017/?retryWrites=false";
	await mongoose.connect(value);
	console.log("MongoDB connected...");
	}catch(err){
		console.log(err);
		process.exit(1);
	}
	
}

module.exports = connectDB;