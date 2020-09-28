const RequestsHelper = require('./RequestsHelper')
const ResponseHelper = require('../utils/ResponseHelper')
const PlansControl = require('../databaseControl/PlansControl')
const AccountRequest = require('../requests/AccountRequest')

module.exports = class PlanRequests extends RequestsHelper {
  static startRequestsListener(app) {
    app.post('/plan/add', AccountRequest.checkAuthToken, PlanRequests.addNewPlan)
  }

  static addNewPlan(req, res) {
    const needleParams = ["title", "description", "createdDate"];
    let uid = req.user._id;
    if (!PlanRequests.checkParameters(req.body, needleParams)) {
      res.send(400)
      return
    }
    if (uid == undefined) {
      res.sendStatus(403)
      return
    }

    const data = {
      title: req.body.title,
      description: req.body.description,
      createdDate: req.body.createdDate,
      deadlineDate: req.body.deadlineDate,
    };

    let responseHelper = new ResponseHelper();
    let planControl = new PlansControl();
    planControl.getListener().on("insert-success", () => {
      responseHelper.setStatus(true);
      res.json(responseHelper.getResponse());
    });
    planControl.getListener().on("insert-error", () => {
      res.json(responseHelper.getResponse());
    });

    planControl.createNewPlan(data, uid);
  }
}