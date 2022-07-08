const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const MessageHandler = require('./handlers/MessageHandler')
const CommandHandler = require('./CommandHandler')
const Discord = require('discord.js-light')

class DiscordManager extends CommunicationBridge {
  constructor(app) {
    super()

    this.app = app

    this.stateHandler = new StateHandler(this)
    this.messageHandler = new MessageHandler(this, new CommandHandler(this))
  }

  connect() {
    this.client = new Discord.Client({
      cacheGuilds: true,
      cacheChannels: true,
      cacheOverwrites: false,
      cacheRoles: true,
      cacheEmojis: false,
      cachePresences: false,
    })

    this.client.on('ready', () => this.stateHandler.onReady())
    this.client.on('message', message => this.messageHandler.onMessage(message))

    this.client.login(this.app.config.discord.token).catch(error => {
      this.app.log.error(error)

      process.exit(1)
    })

    process.on('SIGINT', () => this.stateHandler.onClose())
  }
  
  async getWebhook(discord, type) {
    let channel = discord.client.channels.cache.get(discord.app.config.discord.guildChatChannel)
    if (type == 'Officer') {channel = discord.client.channels.cache.get(discord.app.config.discord.officerChannel)}
    if (type == 'Logger') {channel = discord.client.channels.cache.get(discord.app.config.discord.loggingChannel)}
  
    let webhooks = await channel.fetchWebhooks()
    if (webhooks.first()) {
      return webhooks.first()
    } else {
      var res = await channel.createWebhook(discord.client.user.username, {
        avatar: discord.client.user.avatarURL(),
      })
      return res
    }
  }

  async onBroadcast({ username, message, guildRank, chat }) {
    this.app.log.broadcast(`${username} [${guildRank}]: ${message}`, `Discord`)
    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        if (chat == 'Guild') {
          this.app.discord.client.channels.fetch(this.app.config.discord.guildChatChannel).then(channel => {
            channel.send({
              embed: {
                description: message,
                color: '6495ED',
                timestamp: new Date(),
                footer: {
                  text: guildRank,
                },
                author: {
                  name: username,
                  icon_url: 'https://www.mc-heads.net/avatar/' + username,
                },
              },
            })
          })
          break
        } else if (chat == 'Officer'){
          this.app.discord.client.channels.fetch(this.app.config.discord.officerChannel).then(channel => {
            channel.send({
              embed: {
                description: message,
                color: '6495ED',
                timestamp: new Date(),
                footer: {
                  text: guildRank,
                },
                author: {
                  name: username,
                  icon_url: 'https://www.mc-heads.net/avatar/' + username,
                },
              },
            })
          })
          break
        }

      case 'webhook':
        message = message.replace(/@/g, '')
        this.app.discord.webhook = await this.getWebhook(this.app.discord, chat)
        this.app.discord.webhook.send({
          content: message, username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username
        })
        break
        
      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }

  onBroadcastCleanEmbed({ message, color, channel }) {
    this.app.log.broadcast(message, 'Event')
    if (channel == 'Logger')  {
      this.app.discord.client.channels.fetch(this.app.config.discord.loggingChannel).then(channel => {
        channel.send({
          embed: {
            color: color,
            description: message,
          }
        })
      })
    } else {
      this.app.discord.client.channels.fetch(this.app.config.discord.guildChatChannel).then(channel => {
        channel.send({
          embed: {
            color: color,
            description: message,
          }
        })
      })
    } 
  }  

  onBroadcastHeadedEmbed({ message, title, icon, color, channel }) {
    this.app.log.broadcast(message, 'Event')
    if (channel == 'Logger')  {
      this.app.discord.client.channels.fetch(this.app.config.discord.loggingChannel).then(channel => {
        channel.send({
          embed: {
            color: color,
            author: {
              name: title,
              icon_url: icon,
            },
            description: message,
          }
        })
      })
    } else { 
      this.app.discord.client.channels.fetch(this.app.config.discord.guildChatChannel).then(channel => {
        channel.send({
          embed: {
            color: color,
            author: {
              name: title,
              icon_url: icon,
            },
            description: message,
          }
        })
      })
    }
  }

  async onPlayerToggle({ username, message, color, channel}) {
    this.app.log.broadcast(username + ' ' + message, 'Event')

    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        if (channel == 'Logger') {
          this.app.discord.client.channels.fetch(this.app.config.discord.loggingChannel).then(channel => {
            channel.send({
              embed: {
                color: color,
                timestamp: new Date(),
                author: {
                  name: `${username} ${message}`,
                  icon_url: 'https://www.mc-heads.net/avatar/' + username,
                },
              }
            })
          })
          break
        } else {
          this.app.discord.client.channels.fetch(this.app.config.discord.guildChatChannel).then(channel => {
            channel.send({
              embed: {
                color: color,
                timestamp: new Date(),
                author: {
                  name: `${username} ${message}`,
                  icon_url: 'https://www.mc-heads.net/avatar/' + username,
                },
              }
            })
          })
          break 
        }

      case 'webhook':
        if (channel == 'Guild') {
          this.app.discord.webhook = await this.getWebhook(this.app.discord, 'Guild')
          this.app.discord.webhook.send({
            username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username, embeds: [{
              color: color,
              description: `${username} ${message}`,
            }]
          })
        }
        if (channel == 'Logger') {
          this.app.discord.webhook = await this.getWebhook(this.app.discord, 'Logger')
          this.app.discord.webhook.send({
            username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username, embeds: [{
              color: color,
              description: `${username} ${message}`,
            }]
          })
        }
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }
}

module.exports = DiscordManager