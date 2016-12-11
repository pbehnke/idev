import express from 'express'

import * as controller from '../controller'

const router = express.Router()

router.post('/getFilePath', controller.getFilePath)

router.get('/getUiConfig', controller.getUiConfig)

export default router