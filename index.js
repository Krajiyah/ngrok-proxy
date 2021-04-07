const express = require('express')
const bodyParser = require('body-parser')
const { Sequelize, Model, DataTypes } = require('sequelize')
const app = express()
const port = process.env.PORT
const dbUrl = process.env.DATABASE_URL
const serverSecret = process.env.SECRET // TODO: use yubi key auth instead of shared secret
const sequelize = new Sequelize(dbUrl, {dialect: 'postgres'})

class Proxy extends Model {}
Proxy.init({
    guid: DataTypes.STRING,
    url: DataTypes.STRING
}, { sequelize, modelName: 'proxy' })

const updateNgrokUrl = async (guid, url) => {
    let proxy = await Proxy.findOne({where:{guid}})
    if (proxy == null) {
        proxy = await Proxy.create({url, guid})
    } else {
        proxy.url = url
        await proxy.save()
    }
}

const postHandler = async(req, res) => {
    try {
        const guid = req.body.guid
        const url = req.body.url
        const secret = req.body.secret
        if (!guid || !url || !secret) return res.status(400).send("Invalid params")
        if (secret != serverSecret) return res.status(403).send("Forbidden")
        await updateNgrokUrl(guid, url)
        res.send("saved")
    } catch(err) {
        console.error(err)
        res.status(500).send('could not save :(')
    }
}

const getHandler = async(req, res) => {
    const guid = req.query.guid
    const secret = req.query.secret
    if (!guid || !secret) return res.status(400).send("Invalid params")
    if (secret != serverSecret) return res.status(403).send("Forbidden")
    try {
        const proxy = await Proxy.findOne({where:{guid}})
        if (!proxy) return res.status(400).send("no such guid exists")
        res.send(proxy.url)
    } catch(err) {
        console.error(err)
        res.status(500).send('Internal Error')
    }
}

;(async() => {
    try {
        await sequelize.sync()
        console.log("DB synced")
    } catch(err) {
        console.error(err)
    }
})()

app.post('/', bodyParser.json(), postHandler)
app.get('/', getHandler)
console.log("Server started and listening for requests...")
app.listen(port || 3000)
