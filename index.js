const { google } = require("googleapis");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mysql = require("mysql2");
require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

const connection = mysql.createConnection(process.env.DATABASE_URL);

const serviceAccountKeyFile = "./amiable-poet-385904-447c730ebf42.json";
const tabNames = ["HOME"];
const range = "A3:Z";

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/getdatasheet", async (req, res) => {
  try {
    const sheetId = req.body.sheetID;
    const googleSheetClient = await _getGoogleSheetClient();
    const data = await _readGoogleSheet(
      googleSheetClient,
      sheetId,
      tabNames,
      range
    );
    res.send(data);
    async function _getGoogleSheetClient() {
      const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountKeyFile,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const authClient = await auth.getClient();
      return google.sheets({
        version: "v4",
        auth: authClient,
      });
    }

    async function _readGoogleSheet(
      googleSheetClient,
      sheetId,
      tabNames,
      range
    ) {
      for (let tabName of tabNames) {
        const res = await googleSheetClient.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${tabName}!${range}`,
        });

        let index = 1;
        res.data.values.forEach(async (row) => {
          if (!row[0]) {
            return;
          }
          switch (tabName) {
            case "HOME":
              connection.query(
                `INSERT INTO prod_ihavecpu (prod_ihc_sn, prod_ihc_sku, prod_ihc_type, prod_ihc_brand, prod_ihc_subcat, prod_ihc_qty, prod_ihc_name, prod_ihc_cost, prod_ihc_price_1, prod_ihc_price_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
              ON DUPLICATE KEY UPDATE prod_ihc_sn = ?, prod_ihc_sku = ?, prod_ihc_type = ?, prod_ihc_brand = ?, prod_ihc_subcat = ?, prod_ihc_qty =?, prod_ihc_name = ?, prod_ihc_cost = ?, prod_ihc_price_1 = ?, prod_ihc_price_2 = ?`,
                [
                  row[0],
                  row[1],
                  row[5],
                  row[4],
                  row[6],
                  row[7],
                  row[3],
                  row[9].replace(",", "").replace(".00", ""),
                  row[10].replace(",", "").replace(".00", ""),
                  row[11].replace(",", "").replace(".00", ""),
                  row[0],
                  row[1],
                  row[5],
                  row[4],
                  row[6],
                  row[7],
                  row[3],
                  row[9].replace(",", "").replace(".00", ""),
                  row[10].replace(",", "").replace(".00", ""),
                  row[11].replace(",", "").replace(".00", ""),
                ],
                function (err, result) {
                  if (err) throw err;

                  console.log(index++ + `. ${row[3]}`);
                }
              );
              break;

            default:
              break;
          }
        });
      }
      return "Data inserted into MySQL database";
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving data from Google Sheet");
  }
});

app.post("/jobdetailslist", (req, res) => {
  connection.query(
    `SELECT * FROM job_details j 
    LEFT JOIN employee e ON e.graphic_id = j.graphic_id`,

    function (err, results, fields) {
      res.send(results);
    }
  );
});

app.post("/employee", (req, res) => {
  connection.query(`SELECT * FROM employee`, function (err, results, fields) {
    res.send(results);
  });
});

app.post("/material", (req, res) => {
  connection.query(`SELECT * FROM material`, function (err, results, fields) {
    res.send(results);
  });
});

app.post("/create_joblist", (req, res) => {
  const {
    job_id,
    graphic_id,
    start_date,
    start_time,
    init_material,
    color_material,
    coating_material,
    workpiece_material,
    dicut,
    other,
    wide_size,
    long_size,
    page,
    number_sheet,
    get_price_1,
    get_price_2,
  } = req.body;
  connection.query(
    `INSERT INTO job_details (job_id, graphic_id, start_date, start_time, init_material, color_material, coating_material, workpiece_material, dicut, other, wide_size, long_size, page, number_sheet, sum_price, get_price_1, get_price_2, cost, depreciation, profit)  
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 800, ?, ?, 200, 500, 1000) `,
    [
      job_id,
      graphic_id,
      start_date,
      start_time,
      init_material,
      color_material,
      coating_material,
      workpiece_material,
      dicut,
      other,
      wide_size,
      long_size,
      page,
      number_sheet,
      get_price_1,
      get_price_2,
    ],
    function (err, results, fields) {
      console.log(err);
      res.send("success");
    }
  );
});

app.put("/edit_mapping/:id", (req, res) => {
  const { id } = req.params;
  const { jib, advice, bnn, commore, itcity } = req.body;
  connection.query(
    `UPDATE prod_ihavecpu SET prod_map_a = ?, prod_map_j = ?, prod_map_b = ?, prod_map_com_more = ?, prod_map_itcity = ? WHERE prod_ihc_sn = ?`,
    [advice, jib, bnn, commore, itcity, id],
    (err, result) => {
      if (err) {
        res.status(500).json({ status: 500, message: err });
      } else {
        res.status(200).send({
          status: 200,
          message: "Update Data Successfully",
        });
      }
    }
  );
});

app.put("/edit_status/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  connection.query(
    `UPDATE pd_monitor SET mnt_status = ? WHERE mnt_id = ?`,
    [status, id],
    (err, result) => {
      if (err) throw err;
      res.send("Data updated successsfully");
    }
  );
});

app.get("/url", (req, res) => {
  connection.query(
    `SELECT * FROM url ORDER BY url_type ASC`,
    function (err, results, fields) {
      res.send(results);
    }
  );
});

app.put("/edit_link/:id", (req, res) => {
  const { id } = req.params;
  const { brand, cat, link } = req.body;
  connection.query(
    `UPDATE url SET url_name = ?, url_type = ?, url_link = ? WHERE url_id = ?`,
    [brand, cat, link, id],
    (err, result) => {
      if (err) throw err;
      res.send("Data updated successsfully");
    }
  );
});

app.delete("/admin_del_link/:id", (req, res) => {
  const id = req.params.id;
  connection.query("DELETE FROM url WHERE url_id = ?", id, (error, result) => {
    if (error) throw error;
    res.send("Delete Data Successsfully");
  });
});

app.delete("/admin_del/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    "DELETE FROM pd_monitor WHERE mnt_id = ?",
    id,
    (error, result) => {
      if (error) throw error;
      res.send("Delete Data Successsfully");
    }
  );
});

app.put("/update_img_mnt/:id", (req, res) => {
  const { id } = req.params;
  const { imageUrl } = req.body;
  connection.query(
    `UPDATE pd_monitor SET mnt_img = ? WHERE mnt_id = ?`,
    [imageUrl, id],
    (err, result) => {
      if (err) throw err;
      res.send("Image uploaded successfully!");
    }
  );
});

app.listen(process.env.PORT || 3000);
