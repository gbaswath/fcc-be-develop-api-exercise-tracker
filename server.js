const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
const circularJSON = require("flatted");
const bodyParser = require("body-parser");
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const userSchema = mongoose.Schema({
  username: String
});
const user = mongoose.model('user', userSchema);
console.log("Created User Schema " + circularJSON.stringify(userSchema));
//Mongo DB Connection
console.log("Connect to MONGO URI " + process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (err, db) => {
  if (err)
    console.error(err);
  else {
    console.log("Connected to Mongo DB ", circularJSON.stringify(db));
    console.log("Mongoose Connection : Connected State " + mongoose.connection.readyState);
  }
});
//Form Data Parser
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
//Create User
app.post("/api/users", function (req, res) {
  console.log("Request Body " + JSON.stringify(req.body));
  let requestUser = new user(req.body);
  requestUser.save(function (err, data) {
    if (err) {
      console.log("Error Creating User " + err);
      res.json(err);
    } else {
      console.log("Created User " + JSON.stringify(requestUser));
      res.json(requestUser);
    }
  });
});
app.get("/api/users", function (req, res) {
  console.log("Invoking Users List");
  const allUsers = user.find(function (err, data) {
    if (err) {
      console.log("Error while fetching All Users " + allUsers);
      res.json(err);
    }
    else {
      console.log("All Users " + JSON.stringify(data));
      res.json(data);
    }
  });
});