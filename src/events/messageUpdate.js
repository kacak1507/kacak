let capsLockSended = false;
let emojiSended = false;
let gameSended = false;
let swearSended = false;
let urlSended = false;
const client = global.client;
const invite = require("../schemas/inviteProtect");
const conf = require("../configs/config.json");
const { MessageEmbed } = require("discord.js");
const moment = require("moment");
moment.locale("tr");
const ms = require("ms");
const swears = require("../configs/swears.json");

module.exports = async (oldMessage, newMessage) => {
  if (newMessage.author.bot || newMessage.member.hasPermission("ADMINISTRATOR")) return;
  const capsLockRegex = /[^A-ZĞÜŞİÖÇ]/g;
  const emojiRegex = /<a?:.+?:\d+>|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
  const inviteRegex = /(https:\/\/)?(www\.)?(discord\.gg|discord\.me|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9-.]+)?/i;
  const mentionRegex = /<@!?&?\d+>/g;
  const swearsRegex = new RegExp(`\\b(${swears.map(x => x.trim()).join("|")})$`, "giu");
  const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/gi;

  if (newMessage.content.replace(capsLockRegex, "").length >= newMessage.content.length / 2) {
    if (newMessage.content.length <= 5 || client.safes(newMessage, "capsLockSafes")) return;
    if (newMessage.deletable) newMessage.delete();
    if (!capsLockSended) {
      newMessage.reply("çok fazla büyük harf kullanmamalısın!").then((x) => x.delete({ timeout: 10000 }));
      capsLockSended = true;
      setTimeout(() => {
        capsLockSended = false;
      }, 10000);
    }
  } else if (emojiRegex.test(newMessage.content) && newMessage.content.match(emojiRegex).length > 3) {
    if (client.safes(newMessage, "emojiSpamSafes")) return;
    if (newMessage.deletable) newMessage.delete();
    if (!emojiSended) {
      newMessage.reply("çok fazla emoji kullanmamalısın!").then((x) => x.delete({ timeout: 10000 }));
      emojiSended = true;
      setTimeout(() => {
        emojiSended = false;
      }, 10000);
    }
  } else if (inviteRegex.test(newMessage.content)) {
    if (client.safes(newMessage, "inviteSafes")) return;
    const invites = await newMessage.guild.fetchInvites();
    if ((newMessage.guild.vanityURLCode && newMessage.content.match(inviteRegex).some((i) => i === newMessage.guild.vanityURLCode)) || invites.some((x) => newMessage.content.match(inviteRegex).some((i) => i === x)) || client.safes(newMessage, "inviteSafes")) return;

    const data = await invite.findOneAndUpdate({ guildID: newMessage.guild.id, userID: newMessage.author.id }, { $inc: { count: 1 } }, { upsert: true, new: true });
    if (data.count >= 3) {
      await invite.deleteOne({ guildID: newMessage.guild.id, userID: newMessage.author.id });
      await newMessage.member.setRoles(conf.penals.jail.roles);
      const penal = await client.penalize(newMessage.guild.id, newMessage.author.id, "JAIL", true, client.user.id, "Çok fazla davet linki atmak.");
      const log = new MessageEmbed()
        .setAuthor(newMessage.author.username, newMessage.author.avatarURL({ dynamic: true, size: 2048 }))
        .setColor("RED")
        .setDescription(`
${newMessage.member.toString()} üyesi jaillendi!

Ceza ID: \`#${penal.id}\`
Jaillenen Üye: ${newMessage.member.toString()} \`(${newMessage.author.username.replace(/\`/g, "")} - ${newMessage.author.id})\`
Jailleyen Yetkili: ${client.user} \`(${client.user.username} - ${client.user.id})\`
Jail Tarihi: \`${moment(Date.now()).format("LLL")}\`
Jail Sebebi: \`Çok fazla davet linki atmak.\`
        `);
    newMessage.guild.channels.cache.get(conf.penals.jail.log).send(log);
    }
    if (newMessage.deletable) newMessage.delete();
    newMessage.reply(`bu sunucuda davet linki atamazsın!${data.count == 2 ? " (bir kere daha atarsan jailleneceksin!)" : ""} \`${data.count}/3\``).then((x) => x.delete({ timeout: 10000 }));
  } else if (mentionRegex.test(newMessage.content) && newMessage.content.match(mentionRegex).length >= 5) {
    newMessage.member.roles.add(conf.penals.mute.roles);
    const penal = await client.penalize(newMessage.guild.id, newMessage.author.id, "CHAT-MUTE", true, client.user.id, "Çok fazla etiket atmak.", true, Date.now() + conf.penals.mute.duration);
    const log = new MessageEmbed()
      .setAuthor(newMessage.author.username, newMessage.author.avatarURL({ dynamic: true, size: 2048 }))
      .setColor("RED")
      .setDescription(`
${newMessage.member.toString()} üyesi, \`${ms(conf.penals.mute.duration)}\` boyunca susturuldu!

Ceza ID: \`#${penal.id}\`
Susturulan Üye: ${newMessage.member.toString()} \`(${newMessage.author.username.replace(/\`/g, "")} - ${newMessage.author.id})\`
Susturan Yetkili: ${client.user} \`(${client.user.username} - ${client.user.id})\`
Susturma Tarihi: \`${moment(Date.now()).format("LLL")}\`
Susturma Bitiş Tarihi: \`${moment(Date.now() + conf.penals.mute.duration).format("LLL")}\`
Susturma Sebebi: \`Çok fazla etiket atmak.\`
      `);
    newMessage.guild.channels.cache.get(conf.penals.mute.log).send(log);
    newMessage.reply(`çok fazla etiket attığın için ${ms(conf.penals.mute.duration)} boyunca susturuldun!`).then((x) => x.delete({ timeout: 10000 }));
  } else if (newMessage.activity) {
    if (client.safes(newMessage, "partSafes")) return;
    if (newMessage.deletable) newMessage.delete();
    if (!gameSended) {
      newMessage.reply("bu kanalda oyun daveti atamazsın!").then((x) => x.delete({ timeout: 10000 }));
      gameSended = true;
      setTimeout(() => {
        gameSended = false
      }, 10000);
    }
  } else if (swearsRegex.test(newMessage.content)) {
    if (client.safes(newMessage, "swearSafes")) return;
    if (newMessage.deletable) newMessage.delete();
    if (!swearSended) {
      newMessage.reply("küfür etmemelisin!").then((x) => x.delete({ timeout: 10000 }));
      swearSended = true;
      setTimeout(() => {
        swearSended = false
      }, 10000);
    }
  } else if (urlRegex.test(newMessage.content)) {
    if (client.safes(newMessage, "urlSafes")) return;
    if (newMessage.deletable) newMessage.delete();
    if (!urlSended) {
      newMessage.reply("bu sunucuda link atamazsın!").then((x) => x.delete({ timeout: 10000 }));
      urlSended = true;
      setTimeout(() => {
        urlSended = false
      }, 10000);
    }
  }
};

module.exports.conf = {
  name: "messageUpdate",
};
