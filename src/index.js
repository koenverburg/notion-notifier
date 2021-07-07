const {config} = require('dotenv')
const { Client } = require("@notionhq/client")

config()

const pp = v => console.log(JSON.stringify(v, null, 2))

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  console.log(todayDisplayName)

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
  // console.log(mostImportantTasks)

  const secondaryTasks = groupTasks(items, types.SECONDARY_TASKS)
  // console.log(secondaryTasks)

  const additionalTasks = groupTasks(items, types.ADDITIONAL_TASKS)
  // console.log(additionalTasks)

  const msg = `
You have the follow tasks for today.
  Most Important Tasks:
${mostImportantTasks.map(item => `  - ${item.title} (${item.status})`).join('\n')}

  Secondary Tasks:
${secondaryTasks.map(item => `  - ${item.title} (${item.status})`).join('\n')}

  Addiation Tasks:
${additionalTasks.map(item => `  - ${item.title} (${item.status})`).join('\n')}

`
  console.log(msg)
  // pp(page)
})()
