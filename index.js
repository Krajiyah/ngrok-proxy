const express = require('express')
const bodyParser = require('body-parser')
const { Sequelize, Model, DataTypes } = require('sequelize')
const app = express()
const port = process.env.PORT
const dbUrl = process.env.DATABASE_URL
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
        if (!guid || !url) return res.status(400).send("Invalid params")
        await updateNgrokUrl(guid, url)
        res.send("saved")
    } catch(err) {
        console.error(err)
        res.status(500).send('could not save :(')
    }
}

const getHandler = async(req, res) => {
    const guid = req.query.guid
    if (!guid) return res.status(400).send("please provide ?guid")
    const proxy = await Proxy.findOne({where:{guid}})
    if (!proxy) return res.status(400).send("no such guid exists")
    return res.redirect(proxy.url)
}

;(async() => {
    try {
        await sequelize.sync()
    } catch(err) {
        console.error(err)
    }
})()

app.post('/', bodyParser.json(), postHandler)
app.get('/', getHandler)
app.listen(port || 3000)