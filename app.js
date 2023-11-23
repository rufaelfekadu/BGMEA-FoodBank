const express = require("express");
const app = express();
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const homeRoutes = require("./routes/home.js");
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const donorRoutes = require("./routes/donor.js");
const agentRoutes = require("./routes/agent.js");
const {s3} = require("./utils/awsUtils.js");
const path = require('path');

require("dotenv").config();
require("./config/dbConnection.js")();
require("./config/passport.js")(passport);



app.set("view engine", "ejs");
app.use(expressLayouts);

// app.use("/assets", express.static(__dirname + "/assets"));
const bucketName = 'staticfile-store';
app.use('/.well-known/pki-validation', express.static(path.join(__dirname, '.well-known', 'pki-validation')));
// Middleware to serve static files from /assets folder in S3
app.use('/assets', (req, res) => {
  const key = req.originalUrl.replace('/assets', 'assets');
  // Example: If request is /static/image.jpg, key becomes assets/image.jpg
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  s3.getObject(params)
    .createReadStream()
    .on('error', (err) => {
      console.error('Error fetching file from S3:', err);
      // res.status(404).send('File not found');
    })
    .pipe(res);
});


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
	secret: "secret",
	resave: true,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(methodOverride("_method"));
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	res.locals.warning = req.flash("warning");
	next();
});

// Routes
app.use(homeRoutes);
app.use(authRoutes);
app.use(donorRoutes);
app.use(adminRoutes);
app.use(agentRoutes);
app.use((req,res) => {
	res.status(404).render("404page", { title: "Page not found" });
});


const port = process.env.PORT || 8080;
app.listen(port, console.log(`Server is running at http://localhost:${port}`));
