require('dotenv').config()

const EventEmitter = require('events').EventEmitter
const MongoClient = require('mongodb').MongoClient

const uri = `mongodb+srv://abolfazlalz:${process.env.DB_PASSWORD}@cluster0.homvc.mongodb.net/plans?retryWrites=true&w=majority`


module.exports = class PlansControl {

    constructor() {
        this.listener = new EventEmitter()
        this.client = new MongoClient(uri, { useNewUrlParser: true })
    }

    getListener() {
        return this.listener
    }

    createNewPlan(data, userId) {
        let createdDate = data.createdDate
        let deadlineDate = createdDate
        if (data.deadlineDate == undefined)
            deadlineDate = data.deadlineDate

        let planData = {
            'title': data.title,
            'description': data.description,
            'dates': {
                'created': date.createdDate,
                'deadline': deadlineDate,
                'modified': date.createdDate
            },
            "users": {
                [userId]: ['creator']
            }
        }

        this.client.connect(err => {
            if (err) {
                this.listener.emit('insert-error')
                return
            }
            const collection = this.client.db("plans").collection("plans");
            collection.insertOne(planData, callback => {
                if (callback != undefined && callback.hasErrorLabel)
                    this.listener.emit("insert-error")
                else
                    this.listener.emit("insrt-success")
            }, error => {
                this.listener.emit("insert-error")
            })
            this.client.close()
        })

    }
}