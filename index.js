const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const { join } = require('path');
const prism = require('prism-media');
prism.FFmpegPath = join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg');
const { PlayerManager } = require('discord-player');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// const player = new PlayerManager(client);

// client.player = player;

// function getPlayer(guildId) {
//   return player.get(guildId);
// }

const ytdl = require('ytdl-core');

client.on('ready', () => {
  console.log('O bot está no ar!');
});

  client.on("messageCreate", async (message) => {
  if (message.content.startsWith("e.p")) {
    // Verifica se o usuário está em um canal de voz
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply(
        "Você precisa estar em um canal de voz para ouvir música!"
      );
    }

    // Verifica se o bot tem permissão para entrar no canal de voz
    if (
      !voiceChannel
        .permissionsFor(client.user)
        .has(PermissionsBitField.Flags.Connect)
    ) {
      return message.reply(
        "Eu não tenho permissão para entrar no seu canal de voz!"
      );
    }

    // Verifica se o bot tem permissão para falar no canal de voz
    if (
      !voiceChannel
        .permissionsFor(client.user)
        .has(PermissionsBitField.Flags.Speak)
    ) {
      return message.reply(
        "Eu não tenho permissão para falar no seu canal de voz!"
      );
    }

    // Conecta o bot ao canal de voz do usuário
    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // Adiciona um handler de erro ao evento 'error'
    connection.on("error", (error) => {
      console.error(error);
      message.reply("Ocorreu um erro ao tentar se conectar ao canal de voz!");
    });

    // Adiciona um handler de encerramento ao evento 'close'
    connection.on("close", () => {
      console.log("Desconectado do canal de voz");
      message.reply(
        "Terminei de tocar a música e me desconectei do canal de voz!"
      );
    });

    const videoUrl = message.content.split(" ")[1];
    if (!ytdl.validateURL(videoUrl)) {
      return message.reply("O link do vídeo do YouTube é inválido!");
    }

    let playlist = false;
    try {
      playlist = await ytpl(videoUrl);
    } catch (error) {
      // O link não é uma playlist
    }

    if (playlist) {
      // Toca a playlist
      const playlistItems = playlist.items;
      const stream = ytdl(playlistItems[0].shortUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);
      const player = createAudioPlayer();

      let currentItem = 1;
      player.on(AudioPlayerStatus.Idle, () => {
        if (currentItem < playlistItems.length) {
          const stream = ytdl(playlistItems[currentItem].shortUrl, {
            filter: "audioonly",
          });
          const resource = createAudioResource(stream);
          player.play(resource);
          currentItem++;
        } else {
          console.log("Playlist terminou de tocar");
          connection.disconnect();
        }
      });

      player.on("error", (error) => {
        console.error(error);
        message.reply("Ocorreu um erro ao tentar tocar a música!");
      });

      player.play(resource);
      connection.subscribe(player);
    } else {
      // Toca apenas a música
      const stream = ytdl(videoUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);
      const player = createAudioPlayer();

      player.on("error", (error) => {
        console.error(error);
        message.reply("Ocorreu um erro ao tentar tocar a música!");
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("Música terminou de tocar");
        connection.disconnect();
      });

      player.play(resource);
      connection.subscribe(player);
    }
  }
});

const search = require('youtube-search');
const queue = [];

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('e.s')) {
    const query = message.content.slice('e.s'.length).trim();

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Você precisa estar em um canal de voz para ouvir música!');
    }

    if (!voiceChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.Connect)) {
      return message.reply('Eu não tenho permissão para entrar no seu canal de voz!');
    }

    if (!voiceChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.Speak)) {
      return message.reply('Eu não tenho permissão para falar no seu canal de voz!');
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    connection.on('error', error => {
      console.error(error);
      message.reply('Ocorreu um erro ao tentar se conectar ao canal de voz!');
    });

    connection.on('close', () => {
      console.log('Desconectado do canal de voz');
      message.reply('Terminei de tocar a música e me desconectei do canal de voz!');
    });

    const searchOptions = {
      maxResults: 1,
      key: 'AIzaSyCN66KigLhYNN_qRzN1-eSFyOXBHmGb4og'
    };

    search(query, searchOptions, async (err, results) => {
      if (err) {
        console.error(err);
        message.reply('Ocorreu um erro ao tentar pesquisar a música!');
        return;
      }

      if (results.length === 0) {
        message.reply('Nenhum resultado encontrado para a sua pesquisa!');
        return;
      }


      const videoUrl = results[0].link;
      const stream = ytdl(videoUrl, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      const player = createAudioPlayer();
      var song_title = results[0].title;
      queue.push({ resource, connection, song_title});
    
      if (queue.length === 1) {
        player.play(resource);
        connection.subscribe(player);
         const embed1 = new EmbedBuilder()
      	.setColor(0x15e75e)
      	.setDescription(`Tocando agora:  ${results[0].title}`)
      message.channel.send({ embeds: [embed1] });
      }else{
         const embed3 = new EmbedBuilder()
      	.setColor(0x15e75e)
      	.setDescription(`Adicionada na fila:  ${results[0].title}`)
      message.channel.send({ embeds: [embed3] });
      }

      player.on('error', error => {
        console.error(error);
        message.reply('Ocorreu um erro ao tentar tocar a música!');
      });

      player.on(AudioPlayerStatus.Idle, async () => {
        console.log('Música terminou de tocar');
        queue.shift();
        if (queue.length > 0) {
          player.play(queue[0].resource);
          const embed2 = new EmbedBuilder()
          	.setColor(0x15e75e)
          	.setDescription(`Tocando agora:  ${queue[0].song_title}`)
          message.channel.send({ embeds: [embed2] });
        } else {
          connection.disconnect();
        }
      });


    });
  }
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('e.stop')) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Você precisa estar em um canal de voz para usar este comando!');
    }

    // Pausa a música atual e limpa a fila
    const player = getPlayer(message.guild.id);
    player.stop();
    queueMap.delete(message.guild.id);

    message.reply('Música parada e fila limpa!');
  }
});

// client.on('messageCreate', async (message) => {
//   if (message.content.startsWith('e.pause')) {
//     const voiceChannel = message.member.voice.channel;
//     if (!voiceChannel) {
//       return message.reply('Você precisa estar em um canal de voz para pausar a reprodução!');
//     }

//     const player = getPlayer(message.guild.id);
//     if (!player) {
//       return message.reply('Não há nada sendo reproduzido!');
//     }

//     if (player.state.status !== AudioPlayerStatus.Playing) {
//       return message.reply('Não há nada sendo reproduzido!');
//     }

//     player.pause();
//     message.react('⏸️');
//   }
// });

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('e.r')) {
    // Verifica se o usuário está em um canal de voz
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Você precisa estar em um canal de voz para usar este comando!');
    }

    // Obtém a conexão do canal de voz do usuário
    const connection = getVoiceConnection(message.guild.id);

    // Verifica se o bot está em um canal de voz
    if (!connection) {
      return message.reply('Eu não estou em um canal de voz neste servidor!');
    }

    // Verifica se o bot está conectado ao mesmo canal de voz que o usuário
    if (connection.joinConfig.channelId !== voiceChannel.id) {
      return message.reply('Eu estou em outro canal de voz neste servidor!');
    }

    // Despausa o player de áudio
    connection.player.unpause();

    // Envia uma mensagem para o canal de texto informando que a música foi despausada
    const currentSong = queue[0];
    const embed = new Discord.MessageEmbed()
      .setColor('#15e75e')
      .setDescription(`Despausando a música: ${currentSong.title}`);
    message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env['token']);




// const { Client, GatewayIntentBits, Partials } = require('discord.js');
// const { EmbedBuilder } = require('discord.js');
// const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.DirectMessages,
//     GatewayIntentBits.GuildMembers,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMessageReactions,
//   ]
// });


// client.on('ready', () => {
//   console.log('O bot está no ar!');
// });

// client.on('messageCreate', (message) => {

//   if (message.author.bot) return;

//   if (message.content === '/ping') message.channel.send(`O ping do bot é de estimados ${client.ws.ping}ms`);

//   if (message.content === '/teste infos') message.channel.send('Arquivo salvo')

//   const embed = new EmbedBuilder()
//   embed.setColor(0x0099FF)
//   embed.setTitle(`Inicio da lista`);
//   embed.setURL('https://open.spotify.com/playlist/1CfyE0WQKONLNZIkJOD9uo?si=d2629cb6322c418a')
//   embed.setDescription('Clique no título para ser redirecionado para a playlist');
//   embed.setImage('https://i.scdn.co/image/ab67706c0000bebb1b7b68142c0a93621a42da5f')
//   embed.addFields(
//     { name: 'Playlist Lolzinho', value: 'data_de_adicao' },
//     { name: '\u200B', value: '\u200B' },
//     { name: 'adicionada por: usuario_adicao', value: 'Escutada: numero_embd', inline: true },
//   )
//   embed.setFooter({ text: 'usuario_chamou', iconURL: 'https://cdn.discordapp.com/avatars/369231549742448640/fd36b95578b033b5c5e924adbebc40a6.webp?size=128' });

//   const botao = new ActionRowBuilder();
//   botao.addComponents(
//     new ButtonBuilder()
//       .setCustomId('primary')
//       .setLabel('Escutar!')
//       .setStyle(ButtonStyle.Primary),
//   );

//   // botao.setURL('https://open.spotify.com/playlist/1CfyE0WQKONLNZIkJOD9uo?si=d2629cb6322c418a');

//   if (message.content !== 'eu te amo') message.channel.send('Não')
//   if (message.content === '/playlist') {

//     message.reply({
//       content: "Teste de resposta 100%",
//       embeds: [embed],
//       components: [botao]
//     });
//   }
// });



// client.login(process.env['token']);