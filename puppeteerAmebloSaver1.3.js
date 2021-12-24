const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const prompts = require('prompts');

(async () => {
    console.log('Puppeteer Ameba Blog Saver 1.3');
    console.log('Author: Nakateru(2021.12.24)');

    //input URL
    const inputted = await prompts({
        type: 'text',
        name: 'url',
        message: 'Please Input AmeBlo Entry or Theme URL:'
    });
    const bloUrl = inputted.url;

    console.time('Processing time');

    //analyze url
    const urlInfo = analyzeUrl(bloUrl);
    //console.log(urlInfo);
    // console.log('List Name: ' + urlInfo[1]);

    //open	browser
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        defaultViewport: {width: 800, height: 600}
    });

    //entrylist
    if (urlInfo[1] === 'entrylist') {
        console.log('Page No: ' + urlInfo[2]);

        //open newPage
        const page = await browser.newPage();

        //search entry url and save in entryUrlArr
        const entryUrlArr = await turnPage(page);

        console.log('Found ' + entryUrlArr.length + ' Entr(ies) in this ' + urlInfo[1]);
        //console.log(entryUrlArr)

        //save every entry in the entryUrlArr
        await Promise.all(entryUrlArr.map(async (x) => {
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            await saveEntry(page, x);
            await page.close();
        }));

        //theme or archive
    } else if (urlInfo[1] === 'theme' || urlInfo[1] === 'archive') {
        console.log('Page No: ' + urlInfo[2]);
        console.log('List Id: ' + urlInfo[3]);

        //open newPage
        const page = await browser.newPage();

        //search entry url and save in the entryUrlArr
        const entryUrlArr = await turnPage(page);

        console.log('Found ' + entryUrlArr.length + ' Entr(ies) in this ' + urlInfo[1]);
        //console.log(entryUrlArr)

        //save every entry in the entryUrlArr
        await Promise.all(entryUrlArr.map(async (x) => {
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            await saveEntry(page, x);
            await page.close();
        }));

        //entry
    } else {
        //print entry id
        console.log('Entry Id: ' + urlInfo[2]);
        //open newPage
        const page = await browser.newPage();
        //save entry
        await saveEntry(page, bloUrl);

    }

    //close browser
    await browser.close();

    console.timeEnd('Processing time');

    console.log('Done!');

    //----------------Function-----------------------------------------
    //analyze url function
    function analyzeUrl(url) {
        if (url.startsWith('https://ameblo.jp/')) {
            const re = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})/);
            console.log('Blog Username: ' + re.groups.userName);
        } else {
            console.log('Error URL!');
            process.exit();
        }

        try {
            const re = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)/);
            const userName = re.groups.userName;
            const listName = re.groups.listName;
            var relListName = undefined;
            var listPage = undefined;
            var listId = undefined;

            if (listName === 'entrylist') {
                console.log('This is an entry list sorted by newest arrivals');
                relListName = listName;
                const re2 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/entrylist-(?<listPage>\d+)/);
                if (re2 != null) {//entrylist page 2~
                    listPage = re2.groups.listPage;
                } else {//entrylist page 1
                    listPage = '1';
                }
                return [userName, relListName, listPage];

                //theme
            } else if (listName.startsWith('theme')) {
                console.log('This is an entry list classified by themes');
                const re2 = listName.match(/theme(?<listPage>\d+)/);

                //page 2~
                if (re2 != null) {
                    relListName = 'theme';
                    listPage = re2.groups.listPage;

                    //page 1
                } else {
                    relListName = 'theme';
                    listPage = '1';
                }
                //find list id
                const re3 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listPage, listId];

                //month
            } else if (listName.startsWith('archive')) {
                console.log('This is an entry list classified by months');
                const re2 = listName.match(/archive(?<listPage>\d+)/);

                //page 2~
                if (re2 != null) {
                    relListName = 'archive';
                    listPage = re2.groups.listPage;
                    //page 1
                } else {
                    relListName = 'archive';
                    listPage = '1';

                }
                //find list id
                const re3 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listPage, listId];

                //entry
            } else if (listName === 'entry') {
                console.log('This is an entry');
                relListName = 'entry';
                const re3 = url.match(/ameblo.jp\/(?<userName>\w+)\/entry-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listId];

                //error
            } else {
                console.log('Error URL');
                process.exit();
            }
        } catch {
            console.log('Error URL');
            process.exit();
        }
    }

    //save images or video function
    function saveMedia(path, mediaUrl) {
        https.get(mediaUrl, res => {
            //console.log(res.headers);
            //get media type
            const contentType = res.headers['content-type'];
            //console.log(contentType);
            var mediaType = '.jpg';
            if (contentType === 'image/jpeg') {
                mediaType = '.jpg';
            } else if (contentType === 'image/gif') {
                mediaType = '.gif';
            } else if (contentType === 'image/png') {
                mediaType = '.png';
            } else if (contentType === 'video/mp4') {
                mediaType = '.mp4';
            }
            //set file name
            const mediaName = path + mediaType;
            //write file
            const stream = fs.createWriteStream(mediaName);
            res.pipe(stream);
            stream.on('finish', () => {
                stream.close();
                //console.log('saved ' + mediaName);
            });

        });
    }

    //save entry function
    async function saveEntry(page, url) {
        //goto Page
        await page.goto(url, {
            waitUntil: 'load',
            timeout: 0
        });

        //find blog title
        var titleText = await page.$eval('h1', element => element.textContent);
        console.log('Blog Title: ' + titleText);

        //find blog theme
        var themeText = await page.$eval('a[rel="tag"]', element => element.textContent);
        themeText = themeText.replace(/[\\:*?"<>|/]/g, "");

        //find blog time
        var timeText = await page.$eval('time', element => element.textContent);
        console.log('Blog Time: ' + timeText);
        //replace NEW!
        if (timeText.includes('NEW!')) {
            timeText = timeText.replace('NEW!', '');
            //console.log(timeText);
        }

        //find images url
        var imgArr = await page.$$eval('img', el => el.map(x => x.getAttribute("src")));
        //console.log(imgArr);

        //image name
        var num = 1;
        timeText = timeText.split(' ')[0];
        titleText = titleText.replace(/[\\:*?"<>|/]/g, "");
        const pathName = themeText + '/' + timeText + ' ' + titleText;

        //create directory
        await mkdirFun(pathName);

        //save entry text
        const entry = await page.$eval('div[class="skin-entryInner"]', element => element.innerText);
        //console.log(entry);
        const entryName = timeText + ' ' + titleText;
        fs.writeFile(pathName + '/' + entryName + ".txt", entry.toString(), {flag: "w"}, function (err) {
            if (!err) {
                console.log('saved ' + entryName);
            } else {
                console.log(err);
            }

        });

        //select user_images
        imgArr = imgArr.filter(arr => arr.startsWith('https://stat.ameba.jp/user_images/'));
        //console.log(imgArr);
        //console.log(imgArr.length);

        //find video url
        var num2 = 1;
        var videoArr = [];
        const frames = await page.frames();
        //console.log(frames.length);
        await Promise.all(frames.map(async (f) => {
            try {
                const res = await f.$eval('video > source', x => x.getAttribute('src'));
                videoArr.push(res);
            } catch {
                ;
            }
        }));

        //save image file
        await imgArr.map(x => {
            saveMedia(pathName + '/' + entryName + ' ' + num, x.replace("?caw=800", ""));
            num++;
        });
        if (imgArr.length !== 0) {
            console.log('saved ' + imgArr.length + ' image(s) in ' + pathName);
        } else {
            console.log('No image in this entry');
        }

        //save video file
        await videoArr.map(x => {
            saveMedia(pathName + '/' + entryName + ' ' + num2, x);
            num2++;
        });
        if (videoArr.length !== 0) {
            console.log('saved ' + videoArr.length + ' video(s) in ' + pathName);
        }

    }

    //is clickable function
    async function isClickable(page, to = 'Next') {
        try {
            const res = await page.$eval('a[data-uranus-component=pagination' + to + ']', ele => ele.getAttribute('class'));
            return !res.includes('is-disabled');
        } catch {
            return false;
        }
    }

    //get entry urls of theme function
    async function getEntryUrl(page) {
        //get entry urls
        var arr = await page.$$eval('div[data-uranus-component="entryItem"] > div > div > a', ele => ele.map(x => x.getAttribute('href')));

        //remove secret entry (remain except 'secret.ameba')
        arr = arr.filter(arr => !arr.startsWith('https://secret.ameba.jp/'));

        //replace urls
        arr = arr.map(e => 'https://ameblo.jp' + e.replace('?frm=theme', ''));
        //console.log(entryArr);

        return arr;
    }

    //turn Page function
    async function turnPage(page) {
        //goto Page
        await page.goto(bloUrl);

        //Page number
        const originalNum = urlInfo[2];
        var num = originalNum;
        console.log('Searching entry on Page ' + num);

        //get Page 1 entry urls and saved in entryArr
        var entryArr = await getEntryUrl(page);

        //turn to Next Page
        while (await isClickable(page, 'Next')) {
            num++;
            console.log('Searching entry on Page ' + num);

            //entrylist
            if (urlInfo[1] === 'entrylist') {
                await page.goto('https://ameblo.jp/' + urlInfo[0] + '/entrylist-' + num + '.html');
                //theme or archive
            } else {
                await page.goto('https://ameblo.jp/' + urlInfo[0] + '/' + urlInfo[1] + num + '-' + urlInfo[3] + '.html');
            }

            //get Page 2~ entry url
            entryArr = entryArr.concat(await getEntryUrl(page));
        }

        //turn to Prev Page
        //if turn from page 2~, get entry url from  Page (originalNum-1) to Page 1
        if (originalNum !== '1') {
            for (num = originalNum - 1; num > 0; num--) {
                console.log('Searching entry on Page ' + num);

                //entrylist
                if (urlInfo[1] === 'entrylist') {
                    await page.goto('https://ameblo.jp/' + urlInfo[0] + '/entrylist-' + num + '.html');
                    //theme or archive
                } else {
                    await page.goto('https://ameblo.jp/' + urlInfo[0] + '/' + urlInfo[1] + num + '-' + urlInfo[3] + '.html');
                }

                //get Page 2~ entry url
                entryArr = entryArr.concat(await getEntryUrl(page));
            }
            return entryArr;
        } else {
            return entryArr;
        }
    }

    //create directory function
    function mkdirFun(path) {
        const isExists = fs.existsSync(path);
        if (!isExists) {
            try {
                fs.mkdirSync(path, {recursive: true});
                console.log('Created Folder' + path);
            } catch {
                console.log('Created Folder Failed');
            }
        } else {
            console.log('Directory Existed!');
        }
    }
})();
