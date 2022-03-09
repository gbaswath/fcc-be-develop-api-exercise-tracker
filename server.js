//Import Dependencies
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
const circularJSON = require("flatted");
const bodyParser = require("body-parser");
require('dotenv').config()

//Initialize Project
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Initialize Port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//User Schema
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

//Fetch All Users
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

//Exercise Schema
const exerciseSchema = mongoose.Schema({
  userID: String,
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model('Exercise', exerciseSchema);
console.log("Created Exercise Schema " + circularJSON.stringify(exerciseSchema));
//Use Middleware to set ID
app.param("_id", function (req, res, next, _id) {
  const userID = _id;
  req._id = userID;
  console.log("[Middleware] Got User ID " + userID);
  next();
});

//Exercise Addition
app.post("/api/users/:_id/exercises", function (req, res) {
  console.log("Request Body " + JSON.stringify(req.body));
  let userID = req._id;
  console.log("Got ID " + userID);
  fetchUserSaveExercise(userID, req, res);
});

//Find User and Save Exercise
function fetchUserSaveExercise(userID, req, res) {
  user.findById(userID, function (err, data) {
    if (err) {
      console.log("Error while retrieving ID " + userID);
      res.json(err);
    } else {
      saveUserExercise(data, userID, req, res);
    }
  });
}

//Save Exercise for User
function saveUserExercise(data, userID, req, res) {
  console.log("Fetched User " + data);
  if (data == null) {
    console.log("No User Found for ID " + userID);
    res.json();
  } else {
    const exercise = createExercise(req);
    saveExercise(exercise, data, res);
  }
}

//Create Exercise from Request
function createExercise(req) {
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  if (req.body.date == null || req.body.date == undefined || req.body.date == '') {
    date = new Date();
  }
  console.log("Got Description " + description + " Duration " + duration + " Date " + date);
  const exercise = new Exercise;
  exercise.userID = req._id;
  exercise.description = description;
  exercise.duration = duration;
  exercise.date = date;
  console.log("Prepared Exercise " + exercise);
  return exercise;
}

//Save Exercise and Prepare Expected Response
function saveExercise(exercise, user, res) {
  exercise.save(function (err, data) {
    if (err) {
      console.log("Error while saving Exercise" + err);
      res.json(err);
    } else {
      console.log("Persisted Exercise " + exercise + "for ID " + user._id);
      result = {
        "username": user.username,
        "description": exercise.description,
        "duration": exercise.duration,
        "date": exercise.date.toDateString(),
        "_id": user._id
      };
      console.log("Prepared Response " + JSON.stringify(result));
      res.json(result);
    }
  });
}

//Fetch All Exercise for User
app.get("/api/users/:_id/logs", function (req, res) {
  console.log("Got User ID " + req._id);
  const fromDate = req.query.from;
  console.log("Got From Date " + fromDate);
  const toDate = req.query.to;
  console.log("Got To Date " + toDate);
  const limit = req.query.limit;
  console.log("Got Result Limit " + limit);
  user.findById(req._id, function (err, data) {
    if (err) {
      console.log("Error while retrieving ID " + req._id);
      res.json(err);
    } else {
      const user = data;
      console.log("Got User " + data);
      fetchExerciseLog(req, res, user, fromDate, toDate, limit);
    }
  });
});

//Fetch Exercise Logs for Given User
function fetchExerciseLog(req, res, user, fromDate, toDate, limit) {
  let filterParams = filterParams(req, fromDate, toDate);
  Exercise.find(filterParams, function (err, data) {
    if (err) {
      console.log("Error while Fetching Exercise " + err);
      res.json(err);
    } else {
      let logs = getExerciseLogs(data, limit);
      let result = {
        "username": user.username,
        "count": data.length,
        "_id": user._id,
        "log": logs
      };
      console.log("Prepared Result " + JSON.stringify(result));
      res.json(result);
    }
  });
}

//Create Filter Query Based on Date & User ID
function filterParams(req, fromDate, toDate) {
  let filterParams = { "userID": req._id };
  if (fromDate != null && fromDate != undefined) {
    if (toDate != null && toDate != undefined)
      filterParams = { "userID": req._id, "date": { $gte: fromDate, $lte: toDate } };

    else
      filterParams = { "userID": req._id, "date": { $gte: fromDate } };
  }
  console.log("Filter Params " + JSON.stringify(filterParams));
  return filterParams;
}

//Prepare Exercise Logs
function getExerciseLogs(data, limit) {
  let logs = [];
  let count = 0;
  let isLimitApplied = false;
  if (limit != null && limit > 0)
    isLimitApplied = true;
  data.forEach(function (exercise) {
    if (isLimitApplied && count >= limit) {
      console.log("Limit Reached " + limit);
      return;
    }
    let log = {
      "description": exercise.description,
      "duration": exercise.duration,
      "date": exercise.date.toDateString(),
    };
    logs.push(log);
    count++;
  });
  console.log("Fetched All Exercises " + JSON.stringify(logs));
  return logs;
}
