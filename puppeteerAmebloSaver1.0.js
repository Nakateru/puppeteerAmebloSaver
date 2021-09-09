const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const readline = require('readline');

(async () => {
	console.log('Puppeteer Ameba Blog Saver 1.0');
	console.log('Author: Nakateru(2021.09.09)');

    //input URL
    const bloUrl = await inputUrl();
    //console.log(bloUrl);

    //open browser
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        defaultViewport: {width: 800, height: 600}
    });

    const page = await browser.newPage();
    await page.goto(bloUrl);

    //find blog title
    var titleText = await page.$eval('h1', element => element.textContent);
    console.log('Blog Title: ' + titleText);

    //find blog time
    var timeText = await page.$eval('time', element => element.textContent);
    console.log('Blog Time: ' + timeText);
    //replace NEW!
    if (timeText.includes('NEW!')) {
        timeText = timeText.replace('NEW!', '');
        //console.log(timeText);
    }

    //find images url
    const imgArr = await page.$$eval('img', el => el.map(x => x.getAttribute("src")));
    //console.log(imgArr);

    //image name
    var num = 1;
    timeText = timeText.split(' ')[0];
    titleText = titleText.replace(/[\\:*?"<>|/]/g, "")
    const pathName = timeText + ' ' + titleText;

    //create directory
    const isExists = fs.existsSync(pathName);
    if (!isExists) {
        fs.mkdirSync(pathName);
    }

    //save entry text
    const entry = await page.$eval('div[class="skin-entryInner"]', element => element.innerText);
    // console.log(entry);
    const entryTxt = pathName + '/' + pathName + ".txt";
    fs.writeFile(entryTxt, entry.toString(), {flag: "w"}, function (err) {
        if (!err) {
            console.log('saved ' + entryTxt);
        } else {
            console.log(err);
        }

    });

    //select user_images
    await imgArr.map(x => {
        if (x.startsWith('https://stat.ameba.jp/user_images/')) {
            saveImg(pathName + '/' + pathName + ' ' + num + '.jpg', x.replace("?caw=800", ""));
            num++;
        }
    });
	
	await browser.close();

	//---------------------------------------------------------
    //input url function
    function inputUrl() {
        const reader = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            reader.question('Input AmeBlo Entry URL:', url => {
                if (url.startsWith('https://ameblo.jp/')) {
                    const re = url.match(/ameblo.jp\/(?<userName>\w+)/);
                    console.log('Blog username: ' + re.groups.userName);
                    resolve(url);
                    reader.close();
                } else {
                    console.log('Error URL!');
                    process.exit();
                }
            });
        });
    }

    //save images function
    function saveImg(path, imgUrl) {
        https.get(imgUrl, res => {
            const stream = fs.createWriteStream(path);
            res.pipe(stream);
            stream.on('finish', () => {
                stream.close();
                console.log('saved ' + path);
            });
        });
    }

})();