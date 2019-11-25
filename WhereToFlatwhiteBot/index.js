const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const fs = require('fs');
const path = require('path');

console.log('Starting the bot...');

const cities = [
    {
        name: 'Amsterdam',
        id: 'Amsterdam',
    },
    {
        name: 'Berlin',
        id: 'Berlin',
    },
    {
        name: 'Lisbon',
        id: 'Lisbon',
    },
    {
        name: 'Minsk',
        id: 'Minsk',
    },
];

const bot = new Telegraf(process.env["TELEGRAM_BOT_TOKEN"], { webhookReply: true });
bot.telegram.setWebhook(process.env["WEBHOOK_ADDRESS"]);

bot.on('callback_query', getCity);
bot.on('sticker', welcomeMessage);
bot.hears(/^/, welcomeMessage);
bot.catch((err, ctx) => { console.log(`Error for ${ctx.updateType}`, err); });

/**
 * Returns the markdown text for the specified city.
 * @param city - the id of the city
 * @param functionDirectory - path to the directory with data files
 */
function getData(city, functionDirectory) {
    return new Promise((resolve, reject) => {
        if (city.data) {
            // return city data from cache
            return resolve(city.data);
        }

        // read city data from a file
        const filePath = path.join(functionDirectory, `${city.id}.md`);
        fs.readFile(filePath, (error, data) => {
            if (error) {
                console.log(error);

                city.data = undefined;
                return resolve('no data :(');
            }

            // save city data to cache
            city.data = data.toString();
            return resolve(city.data);
        });
    });
}

/**
 * Returns a welcome messge with buttons for all available cities
 * @param context - Telegraf context
 */
function welcomeMessage(context) {
    return context.reply(`Hey ${context.from.first_name}!\nSelect a city where you'd like to have a great flat white:`, Extra.markup((m) =>
        m.inlineKeyboard(
            cities.map((city) => m.callbackButton(city.name, city.id))
        )));
}

/**
 * Returns a data for the specified city
 * @param context - Telegraf context
 */
function getCity(context) {
    const cityId = context.update.callback_query.data;
    const city = cities.filter((city) => city.id === cityId)[0];

    return context.answerCbQuery().then(() => {
        getData(city, context.functionDirectory).then((data) => {
            return context.replyWithMarkdown(data, {
                // do not add preview for links
                disable_web_page_preview: true,
            });
        });
    });
}

module.exports = async function (context, req) {
    // extend Telegraf context with the data files directory
    bot.context.functionDirectory = context.executionContext.functionDirectory;

    try {
        const update = JSON.parse(req.rawBody);

        bot.handleUpdate(update).catch((error) => {
            console.log('Error processing update');
            console.log(error);
        });
    } catch (error) {
        console.error('Error parsing body', error);
        return context.res = {
            body: ""
        };
    }
};
