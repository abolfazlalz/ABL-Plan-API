require('dotenv').config()

const EventEmitter = require('events').EventEmitter
const mongo = require('mongodb')
const MongoClient = mongo.MongoClient
const moment = require('moment')
const AccountsControl = require('./AccountsControl')
const DatabaseHelper = require('./DatabaseHelper')

module.exports = class PlansControl extends DatabaseHelper {

    constructor() {
        super('plans')
    }

    createNewPlan(data, userId) {

        let account = new AccountsControl()

        account.isUserIdValid(userId, (isUserValid) => isValidResult(this, isUserValid), (error) => {
            this.listener.emit('insert-error', error)
        })

        /**
         * 
         * @param {PlansControl} _this 
         * @param {Boolean} isUserValid 
         */
        function isValidResult(_this, isUserValid) {
            if (!isUserValid) {
                _this.listener.emit('insert-error', 'The entered user is invalid')
                return
            }

            let createdDate = data.createdDate
            if (!_this.checkDate(createdDate)) {
                _this.listener.emit('insert-error', 'Created date is not valid')
                return
            }
            let deadlineDate = createdDate
            if (data.deadlineDate != undefined) {
                if (!_this.checkDate(data.deadlineDate)) {
                    _this.listener.emit('insert-error', 'Deadline date is not valid')
                    return
                }
                deadlineDate = data.deadlineDate
            }

            if (data.title == '' || data.title == undefined) {
                _this.listener.emit('insert-error', 'Title must have value')
                return
            }

            let planData = {
                'title': data.title,
                'description': data.description,
                'dates': {
                    'created': data.createdDate,
                    'deadline': deadlineDate,
                    'modified': data.createdDate
                },
                "users": {
                    ['user' + userId]: ['creator']
                }
            }

            _this.Client.connect(err => {
                if (err) {
                    _this.listener.emit('insert-error', err)
                } else {
                    const plans = _this.client.db("plans").collection("plans")
                    plans.insertOne(planData, callback => {
                        if (callback != undefined && callback.hasErrorLabel)
                            _this.listener.emit("insert-error", callback.error)
                        else
                            _this.listener.emit("insert-success")
                    }, error => {
                        _this.listener.emit("insert-error", error)
                    })
                }
                _this.client.close()
            })
        }
    }

    checkDate(date) {
        return moment(date, "YYYY-M-D h:m", true).isValid()
    }

    getByPlanId(planId, callback, error) {
        this.getById(planId, 'plans', callback, error)
    }

    getPlans(uid, limit = 10, skip = 0) {
        this.Client.connect(err => {
            if (err) {
                this.listener.emit('get-plans-error', err)
                return
            }
            const collection = this.client.db("plans").collection("plans")
            collection.find({ ['users.user' + uid]: { $exists: true } }).limit(limit).skip(skip).toArray((err, result) => {
                if (err) {
                    this.listener.emit('get-plans-error', err)
                    return
                }
                this.listener.emit('get-plans', result)
            })
        })
        this.client.close()
    }

    updateCollection(filter, data, collectionName, callback, error) {
        data['dates']['modified'] = moment().format('YY-MM-DD HH-mm')
        super.updateCollection(filter, data, collectionName, callback, error)
    }

    updateOneCollection(filter, data, collectionName, callback, error) {
        // if ('data' in data) {
        //     data['dates']['modified'] = moment().format('YY-MM-DD HH-mm')
        // } else {
        //     data['dates'] = {
        //         modified: moment().format('YYYY-MM-DD HH:mm:ss')
        //     }
        // }
        super.updateOneCollection(filter, data, collectionName, callback, error)
    }

    /**
     * update data of a plan
     * @param {Integer} planId the plan you want to update
     * @param {Array} dataToUpdate list of data you want to updateOneCollection
     * @param {Function} callback 
     * @param {Function} error 
     */
    updatePlan(planId, userId, dataToUpdate, callback, error) {
        this.isUserPlanAdmin(planId, userId, result => {
            if (result == false) {
                error('You dont have access to this plan', 403)
                return
            }
            const keys = Object.keys(dataToUpdate)
            const allowedKeys = ['deadlineDate', 'title', 'description']
            for (let key of keys) {
                if (!(allowedKeys.includes(key))) {
                    delete dataToUpdate[key]
                }
            }
            if ('deadlineDate' in dataToUpdate) {
                dataToUpdate.dates = {
                    modified: dataToUpdate.deadlineDate
                }
                delete dataToUpdate.deadlineDate
            }
            var o_id = new mongo.ObjectID(planId)
            const filter = { '_id': o_id }
            this.updateOneCollection(filter, dataToUpdate, 'plans', callback, error)
        }, error)
    }

    deletePlan(planId, userId, callback, error = undefined) {
        this.isUserPlanAdmin(planId, userId, isUserValid => {
            if (!isUserValid) {
                error('You dont have access to this plan', 403)
                return
            }
            var o_id = new mongo.ObjectID(planId)
            const filter = { '_id': o_id }

            this.deleteOneCollection(filter, 'plans', callback, error)
        }, error)
    }

    isUserPlanAdmin(planId, userId, callback, error = undefined) {
        var o_id = new mongo.ObjectID(planId)
        const filter = {
            $and: [
                { '_id': o_id },
                { ['users.user' + userId]: { $exists: true } },
                { ['users.user' + userId]: { $in: ['creator'] } }
            ]
        }
        this.checkDataExists(filter, 'plans', callback, error)
    }

    isValidPlanId(planId, callback, error = undefined) {
        const id = new mongo.ObjectID(planId)
        const filter = { _id: id }
        this.checkDataExists(filter, 'plans', callback, error)
    }
}