const express = require('express')
const expressJoi = require('@escook/express-joi')
const {
	pub_event_schema,
	add_event_comment_schema,
	praise_comment_schema,
	praise_event_schema,
	report_event_schema
} = require('../../schema/client/s_event')
const {
	pubEvent,
	getEventListById,
	addEventComment,
	getEventComment,
	praiseComment,
	praiseEvent,
	getEventPraiseList,
	deleteEvent,
	getEventReplyList,
	getEventData,
	reportEvent
} = require('../../router_handler/client/h_event')
const router = express.Router()

router.post('/pubEvent', expressJoi(pub_event_schema), pubEvent)

// 获取动态列表
router.get('/getEventListById', getEventListById)

// 发布动态评论
router.post('/addEventComment', expressJoi(add_event_comment_schema), addEventComment)

// 获取动态评论
router.get('/getEventComment', getEventComment)

// 点赞动态评论
router.post('/praiseComment', expressJoi(praise_comment_schema), praiseComment)

// 点赞动态
router.post('/praiseEvent', expressJoi(praise_event_schema), praiseEvent)

// 动态点赞列表
router.get('/getEventPraiseList', getEventPraiseList)

// 删除动态
router.post('/deleteEvent', deleteEvent)

// 获取动态转发
router.get('/getEventReplyList', getEventReplyList)

// 获取动态数据
router.get('/getEventData', getEventData)

// 举报动态
router.post('/reportEvent', expressJoi(report_event_schema), reportEvent)

module.exports = router