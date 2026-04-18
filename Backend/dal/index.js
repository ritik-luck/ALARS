/**
 * ============================================================
 *  ALARS — Data Access Layer
 *  Barrel / Index Module
 * ============================================================
 *
 *  Single entry-point that re-exports every DAL component so
 *  the rest of the application can import them from one place:
 *
 *    const { logDAL, incidentDAL } = require('./dal');
 *    const logs = await logDAL.getAllLogs();
 *
 * ============================================================
 */

const connection  = require('./connection');
const userDAL     = require('./userDAL');
const logDAL      = require('./logDAL');
const incidentDAL = require('./incidentDAL');
const alertDAL    = require('./alertDAL');

module.exports = {
  connection,
  userDAL,
  logDAL,
  incidentDAL,
  alertDAL,
};
