// 项目入口文件
// 导入express包
const express = require('express')
const path = require('path');
// 表单验证规则
const joi = require('joi')  
// 解析token
const expressJWT = require('express-jwt')
// cookie
// const cookieParser = require('cookie-parser');
const config = require('./config')
const db = require('./db/index')
const {
	port
} = require('./config')


// 创建服务器实例对象
const app = express()
const express_ws = require('express-ws');
const wsObj = {};
express_ws(app);
app.ws('/socketServer/:uid', (ws, req) => {
    const uid = req.params.uid;
    wsObj[uid] = ws;
    ws.onmessage = (msg) => {
        let data = JSON.parse(msg.data);
        const fromId = uid;
        if (fromId != data.to_id && wsObj[data.to_id]) {
			
            // wsObj[to_id]   表示 接收方 与服务器的那条连接
            // wsObj[fromId] 表示 发送方 与服务器的那条连接
            wsObj[data.to_id].send(msg.data)
        }
    }
});

// 导入并配置cors中间件
const cors = require('cors')
app.use(cors())

// 托管静态资源
// app.use(express.static('./public'))
app.use(express.static(path.join(__dirname,'public')))
app.use(express.static(path.join(__dirname,'uploads')))

// 解析表单数据中间件
app.use(express.urlencoded({extended: false}))

// 封转res.cc中间件 函数返回接口响应内容
// 接口出错或者查找失败的时候调用
app.use((req, res, next) => {
  res.cc = (err, status = 1) => {
    res.send({
      status,
      msg: err instanceof Error ? err.message : err
    })
  }
  next()
})

// app.use(cookieParser());

// 在路由之前配置解析token的中间件
app.use(expressJWT({
  secret: config.jwtSecretKey
}).unless({  // 排除 /api 开头的接口
  path: [/^\/admin\/api/, /^\/client\/api/, /^\/public/, /^\/uploads/, /^\/code\/getCode/]
}))

app.use((req, res, next) => {
  let baseUrl = req.originalUrl.substring(1).split('/')
  let root = baseUrl[0], url = baseUrl[1]
  console.log(root)
  if(root == 'client') {
    req.u_type = 'client'
    if(url != 'api') {
      // 验证账号状态
      const sqlStr = 'select * from ev_users where id=?'
      db.query(sqlStr, req.user.id, (err, results) => {
        if(err) return res.cc(err)
        if(results.length != 1) return res.cc('获取用户信息失败', -1)
        if(results[0].status == 2) return res.cc('账号已被封禁', -1)
        // delete results[0].password
        req.userData = results[0]
        next()
      })
    } else {
      next()
    }
  } else if(root == 'admin'){
    req.u_type = 'admin'
    if(url != 'api') {
      const sqlStr = 'select * from ev_admins where admin_id=? and status = "1"'
      db.query(sqlStr, req.user.admin_id, (err, results) => {
        if(err) return res.cc(err)
        if(results.length != 1) return res.cc('获取用户信息失败', -1)
        if(results[0].status == 2) return res.cc('账号已被封禁', -1)
        req.adminData = results[0]
        next()
      })
    } else {
      next()
    }
  } else if(root === 'code') {
    next()
  } else {  // 上传
    let sqlStr = ''
    if(req.user.admin_id) {
      sqlStr = `select * from ev_admins where admin_id='${req.user.admin_id}'`
    } else if(req.user.id) {
      sqlStr = `select * from ev_users where id = '${req.user.id}'`
    } else {
      return res.cc('用户信息错误', -1)
    }
    db.query(sqlStr, (err, results) => {
      if(err) return res.cc(err)
      if(results.length != 1) return res.cc('用户信息错误', -1)
      req.userData = results[0]
      next()
    })
  }
})

// 后台模块
// 注册用户相关路由
app.use('/admin/api', require('./router/admin/user'))
// 管理员相关模块
app.use('/admin/api', require('./router/admin/admin'))
// 用户信息相关路由
app.use('/admin/my', require('./router/admin/userInfo'))
// 文章分类路由模块
app.use('/admin/art', require('./router/admin/artcate'))
// 文章路由模块
app.use('/admin/art', require('./router/admin/article'))
// 管理员模块
app.use('/admin/admin', require('./router/admin/adminPower'))
// 日志模块
app.use('/admin/log', require('./router/admin/log'))
// 公告模块
app.use('/admin/notice', require('./router/admin/notice'))
// 文章举报
app.use('/admin/rep', require('./router/admin/report'))
// 评论模块
app.use('/admin/com', require('./router/admin/comment'))
// 视频模块
app.use('/admin/vid', require('./router/admin/video'))
// 首页模块
app.use('/admin/ind', require('./router/admin/index'))
// 动态模块
app.use('/admin/eve', require('./router/admin/event'))
// 消息模块
app.use('/admin/msg', require('./router/admin/mesasge'))

// 验证码
app.use('/code', require('./router/code'))

// 前台模块
// 用户信息
app.use('/client/my', require('./router/client/userInfo'))
// 用户登录/注册
app.use('/client/api', require('./router/client/user'))
// 用户文章
app.use('/client/art', require('./router/client/article'))
// 收藏文章
app.use('/client/res', require('./router/client/collect'))
// 举报文章
app.use('/client/rep', require('./router/client/report'))
// 点赞文章
app.use('/client/pra', require('./router/client/praise'))
// 视频模块
app.use('/client/vid', require('./router/client/video'))
// 评论模块
app.use('/client/com', require('./router/client/comment'))
// 搜索模块
app.use('/client/sea', require('./router/client/search'))
// 聊天模块
app.use('/client/chat', require('./router/client/chat'))
// 动态模块
app.use('/client/eve', require('./router/client/event'))

// 上传文件模块
app.use('/upload', require('./router/upload'))


// 错误捕获中间件
app.use((err, req, res, next) => {
  // 判断是否是表单验证出错而引发的中间件
  if(err instanceof joi.ValidationError) return res.cc(err)
  // 如果包含了name属性为 UnauthorizedError，则表示token错误
  if(err.name == 'UnauthorizedError') return res.cc('登录失效，请查询登录', -1)
  // 未知错误
  res.send(err)
})

// 启动服务器
app.listen(port, () => {
  console.log('success')
})