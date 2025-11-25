import mysql from "mysql2/promise";
export const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "yourpassword",
  database: "airbnb_clone"
});
