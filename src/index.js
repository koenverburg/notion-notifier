const {config} = require('dotenv')
const {Client} = require("@notionhq/client")
const {IncomingWebhook} = require('@slack/webhook')

config()

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const types = {
  MOST_IMPORTANT_TASKS:   'Most importants Tasks',
  SECONDARY_TASKS:        'Secondary Tasks',
  ADDITIONAL_TASKS:       'Additional Tasks'
}

const getDay = (index) => {
  if (index === null || index === undefined) {
    return undefined
  }
  return days[index]
}

;(async () => {
  const today = new Date()
  const todayDisplayName = getDay(today.getDay())

  const page = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE, 
    filter: {
      property: 'Day',
      select: {
        equals: todayDisplayName,
      }
    }
  })

  const checkForPrecents = (value, fallback) => {
    if (value) {
      return value
    }
    return fallback
  }

  const items = page.results.map(x => {
    if (!x.properties) {
      return
    }

    return {
      title: checkForPrecents(x.properties.Name.title[0].text.content, ''),
      type: checkForPrecents(x.properties.Priority.select.name, ''),
      status: checkForPrecents(x.properties.Status.select.name, ''),
    }
  })

  const groupTasks = (list, type) => {
    return list.reduce((total, item) => {
      if (item.type === type) {
        total.push(item)
      }
      return total
    }, [])
  }

  const mostImportantTasks = groupTasks(items, types.MOST_IMPORTANT_TASKS)
  const secondaryTasks = groupTasks(items, types.SECONDARY_TASKS)
  const additionalTasks = groupTasks(items, types.ADDITIONAL_TASKS)

  const msg = `
Your daily grind notification to work harder
---
You have the follow tasks for today.\n
  Most Important Tasks:
${mostImportantTasks.map(item => `  - (${item.status}) ${item.title}`).join('\n')}

  Secondary Tasks:
${secondaryTasks.map(item => `  - (${item.status}) ${item.title}`).join('\n')}

  Additional Tasks:
${additionalTasks.map(item => `  - (${item.status}) ${item.title}`).join('\n')}`

  await webhook.send({
    text:      msg,
    channel:   process.env.SLACK_CHANNEL,
    username:  'Keep on track Notifier',
    icon_url:  'https://github.com/koenverburg.png?size=48'
    // msg:       'Your daily grind notification to work harder',
    // footer:    'Keep going!!',
  })

})()
