// api/scrape.js

import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { usn, day, month, year } = req.body;

    try {
      const browser = await puppeteer.launch({
        headless: true, // Set to false if you want to see the browser
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();

      await page.goto('https://parents.msrit.edu/newparents/');
      await page.setViewport({ width: 1080, height: 1024 });

      await page.evaluate(
        ({ usn, day, month, year }) => {
          function triggerEvent(element, eventType) {
            const event = new Event(eventType, {
              bubbles: true,
              cancelable: true,
            });
            element.dispatchEvent(event);
          }

          const usernameField = document.getElementById('username');
          if (usernameField) {
            usernameField.value = usn;
            triggerEvent(usernameField, 'input');
          }

          const ddField = document.getElementById('dd');
          const mmField = document.getElementById('mm');
          const yyyyField = document.getElementById('yyyy');

          if (ddField && mmField && yyyyField) {
            ddField.value = day.padStart(2, '0') + ' ';
            if (ddField.value !== day.padStart(2, '0') + ' ') {
              ddField.value = day.padStart(2, '0');
            }
            if (ddField.value === '') {
              ddField.selectedIndex = parseInt(day);
            }
            triggerEvent(ddField, 'change');

            mmField.value = month.padStart(2, '0');
            triggerEvent(mmField, 'change');

            yyyyField.value = year;
            triggerEvent(yyyyField, 'change');
          }

          if (typeof putdate === 'function') {
            putdate();
          }

          setTimeout(() => {
            const form = document.getElementById('login-form');
            if (form) {
              form.submit();
            }
          }, 500);
        },
        { usn, day, month, year }
      );

      await page.waitForNavigation();

      const scrapedData = await page.evaluate(() => {
        const name = document.querySelector('h3').innerText;
        const courses = [];
        const rows = document.querySelectorAll('table.cn-pay-table tbody tr');

        rows.forEach((row) => {
          const columns = row.querySelectorAll('td');
          if (columns.length >= 5) {
            const code = columns[0].textContent.trim();
            const name = columns[1].textContent.trim();
            const attendanceButton = columns[4].querySelector('button');
            const cie_url = columns[5].querySelector('a').href;
            const attendance = attendanceButton
              ? parseInt(attendanceButton.textContent)
              : 0;

            courses.push({ code, name, attendance, cie_url });
          }
        });

        return { name, courses };
      });

      for (let course of scrapedData.courses) {
        await page.goto(course.cie_url);

        const finalCIEMarks = await page.evaluate(() => {
          const finalCIEMarksCell = document.querySelector(
            'table.uk-table tbody tr td:nth-child(8)'
          );
          return finalCIEMarksCell ? finalCIEMarksCell.textContent.trim() : 'N/A';
        });

        course.finalCIEMarks = finalCIEMarks;
      }

      await browser.close();

      res.status(200).json(scrapedData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}


