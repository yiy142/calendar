const UserPreference = require("../models/userPreference.model");
const colors = require("colors/safe");

function log(text) {
  console.log(`${colors.blue("[preferenceAPI]")} ${text}`);
}

const preferenceAPIs = (app) => {
  app.post("/preference/save", async (req, res) => {
    log("in add preference");
    try {
      const deleted = await UserPreference.remove({
        user_id: req.body.user_id,
      }).exec();
      console.log(deleted);
      const newPreference = new UserPreference({
        user_id: req.body.user_id,
        break_time: req.body.break_time || 0,
        day_off: req.body.day_off || [],
        max_meeting: req.body.max_meeting || 0,
        preferences: req.body.preferences || [],
      });
      newPreference
        .save()
        .then(() => res.json("new Preference added!"))
        .catch(err => { throw err });
    } catch (e) {
      res.status(400).json("Error: ", e)
    }
  });

  app.put("/preference/update", (req, res) => {
    log("in update data");
    UserPreference.findOneAndUpdate({
      calendar_id: req.body.calendar_id
    },
      {
        $set: {
          break_time: req.body.break_time || 0,
          day_off: req.body.day_off || [],
          max_meeting: req.body.max_meeting || 0,
          preferences: req.body.preferences || []
        }
      },
      {},
      (error, result) => {
        if (error) {
          log(error);
          res.status(500).json("Error: " + error);
        }
        else {
          if (!result) {
            log("not found");
            res.status(500).send("not found");
          }
          else res.status(200).send("updated!");
        }
      }
    );
  });
  app.post("/preference/get", (req, res) => {
    log("in get");
    const { user_id } = req.body;
    UserPreference.find({ user_id }, (error, result) => {
      if (error) {
        log(error);
        res.status(500).json("Error: " + error);
      } else if (!result) {
        log(" not found");
        res.status(500).send("not found");
      }
      else {
        res.status(200).json(result);
      }
    });
  });
  app.get("user/list", (req, res) => {
    log("in list");
    UserPreference.find({}, (error, result) => {
      if (error) {
        log(error);
        res.status(500).json("Error: " + error);
      } else if (!result) {
        log("empty");
        res.status(200).json(null);
      } else {
        log(result);
        res.status(200).json(result);
      }
    });
  })
};

module.exports = preferenceAPIs;