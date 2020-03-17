const express = require('express')
const bodyParser = require('body-parser')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { Sequelize, Model, DataTypes } = require('sequelize')
const app = express()
const domain = process.env.DOMAIN
const port = process.env.PORT
const dbUrl = process.env.DATABASE_URL
const sequelize = new Sequelize(dbUrl, {dialect: 'postgres'})
const defaultRootUrl = 'https://google.com'

class Proxy extends Model {}
Proxy.init({
    path: DataTypes.STRING,
    dst: DataTypes.STRING
}, { sequelize, modelName: 'proxy' })

const getDefaultProxyTable = () => {
    const table = {}
    table[domain+'/bing'] = 'https://bing.com'
    table[domain+'/yahoo'] = 'https://yahoo.com'
    return table
}
 
const getProxyInfo = async() => {
    const proxies = await Proxy.findAll()
    if (proxies.length == 0) return {router: getDefaultProxyTable(), target: defaultRootUrl}
    return proxies.reduce((info, proxy) => {
        if (proxy.path == '/') {
            info.target = proxy.dst
        }
        info.router[domain + proxy.path] = proxy.dst
        return info
    }, {router: {}, target: defaultRootUrl})
}

const updateNgrokUrl = async (path, dst) => {
    console.log(path, dst)
    let proxy = Proxy.findOne({where:{path}})
    if (proxy == null) {
        proxy = await Proxy.create({path, dst})
    } else {
        proxy.dst = dst
        await proxy.save()
    }
    await refreshInfo()
}

const refreshInfo = async() => {
    const info = await getProxyInfo()
    Object.assign(options, info)
    console.log("INFO: ", options)
}

const deleteHandler = async(_, res)  => {
    try {
        await Proxy.destroy({where: {}, truncate: true})
        res.send("cleared proxy table")
    } catch(err) {
        console.error(err)
        res.status(500).send("could not clear proxy table :(")
    }
}

const postHandler = async(req, res) => {
    try {
        const path = req.body.path
        const dst = req.body.url
        if (!path || !dst) return res.status(400).send("Invalid params")
        await updateNgrokUrl(path, dst)
        res.send("saved")
    } catch(err) {
        console.error(err)
        res.status(500).send('could not save :(')
    }
}

const options = {target: 'https://google.com', router: getDefaultProxyTable(), changeOrigin: true}

;(async() => {
    try {
        await sequelize.sync({force: true})
        await refreshInfo()
    } catch(err) {
        console.error(err)
    }
    app.post('/ngrok', bodyParser.json(), postHandler)
    app.delete('/ngrok', deleteHandler)
    app.use(createProxyMiddleware(options))
    app.listen(port || 3000)
})()