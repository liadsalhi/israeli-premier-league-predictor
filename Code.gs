// Updates match results from API and advances to next round when all results are filled
function updateLiveResults() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var apiKey = "YOUR_API_KEY";
  var leagueId = "4644";
  var season = "2025-2026";

  var currentRound = parseInt(sheet.getRange("N1").getValue()) || 25;

  var resultsCol = sheet.getRange("A2:A8").getValues();
  var allFilled = resultsCol.every(function(row) {
    return row[0].toString().trim() !== "";
  });

  if (allFilled) {
    currentRound++;
    Logger.log("Round finished! Moving to round: " + currentRound);

    var nextUrl = "API_URL"; // Replace with your API endpoint
    var nextResponse = UrlFetchApp.fetch(nextUrl);
    var nextJson = JSON.parse(nextResponse.getContentText());
    var nextEvents = nextJson.events;

    if (!nextEvents || nextEvents.length === 0) {
      Logger.log("No matches found for round " + currentRound);
      return;
    }

    var matchesToFill = [];
    for (var j = 0; j < 7; j++) {
      matchesToFill.push([nextEvents[j] ? nextEvents[j].strHomeTeam + " vs " + nextEvents[j].strAwayTeam : ""]);
    }
    sheet.getRange("I2:I8").setValues(matchesToFill);

    var kValues = sheet.getRange("K2:K7").getValues();
    for (var k = 0; k < kValues.length; k++) {
      var currentScore = kValues[k][0];
      sheet.getRange(k + 2, 11).setFormula("=" + currentScore + " + SUM(C10:C16)");
    }

    sheet.getRange("A2:A8").clearContent();
    sheet.getRange("B2:G8").clearContent();
    unlockGuesses(sheet);
    sheet.getRange("N1").setValue(currentRound);
    Logger.log("Matches updated for round " + currentRound);

  } else {
    Logger.log("Updating results for round: " + currentRound);

    var url = "API_URL"; // Replace with your API endpoint
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());
    var events = json.events;

    if (!events) { Logger.log("No results found"); return; }

    var firstMatchTime = getFirstMatchTimeFromEvents(events);
    if (firstMatchTime) {
      var now = new Date();
      var lockTime = new Date(firstMatchTime.getTime() - 3 * 60 * 60 * 1000);
      if (now >= lockTime) {
        lockGuesses(sheet);
        Logger.log("Guesses locked");
      }
    }

    var myMatches = sheet.getRange("I2:I8").getValues();
    var resultsToFill = [];

    for (var i = 0; i < myMatches.length; i++) {
      var matchInSheet = myMatches[i][0].toString().toLowerCase().trim();
      var foundResult = "";

      for (var j = 0; j < events.length; j++) {
        var ev = events[j];
        if (!ev.strHomeTeam || !ev.strAwayTeam) continue;
        var homeTeamAPI = ev.strHomeTeam.toLowerCase().trim();
        var awayTeamAPI = ev.strAwayTeam.toLowerCase().trim();
        if (matchInSheet.includes(homeTeamAPI) && matchInSheet.includes(awayTeamAPI)) {
          if (ev.intHomeScore !== null && ev.intAwayScore !== null) {
            foundResult = ev.intHomeScore + "-" + ev.intAwayScore;
          }
          break;
        }
      }
      resultsToFill.push([foundResult]);
    }

    sheet.getRange("A2:A8").setValues(resultsToFill);
    Logger.log("Results updated");
  }
}

// Helper - returns the earliest match time from a list of events
function getFirstMatchTimeFromEvents(events) {
  var times = events
    .filter(function(e) { return e.dateEvent && e.strTime; })
    .map(function(e) { return new Date(e.dateEvent + "T" + e.strTime); })
    .sort(function(a, b) { return a - b; });
  return times.length > 0 ? times[0] : null;
}

// Locks the guesses range B2:G8 to prevent editing
function lockGuesses(sheet) {
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protections.forEach(function(p) {
    if (p.getRange().getA1Notation() === "B2:G8") p.remove();
  });
  var protection = sheet.getRange("B2:G8").protect();
  protection.setDescription("Guesses locked");
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

// Removes the lock from the guesses range
function unlockGuesses(sheet) {
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protections.forEach(function(p) {
    if (p.getRange().getA1Notation() === "B2:G8") p.remove();
  });
  Logger.log("Guesses unlocked");
}

// Resets the sheet to a specific round - change round variable as needed
function resetToRound() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var apiKey = "YOUR_API_KEY";
  var leagueId = "4644";
  var season = "2025-2026";
  var round = 25;

  sheet.getRange("N1").setValue(round);
  sheet.getRange("A2:A8").clearContent();
  sheet.getRange("B2:G8").clearContent();

  var url = "https://www.thesportsdb.com/api/v1/json/" + apiKey + "/eventsround.php?id=" + leagueId + "&r=" + round + "&s=" + season;
  var response = UrlFetchApp.fetch(url);
  var json = JSON.parse(response.getContentText());
  var events = json.events;

  if (!events || events.length === 0) { Logger.log("No matches found for round " + round); return; }

  var matchesToFill = [];
  for (var j = 0; j < 7; j++) {
    matchesToFill.push([events[j] ? events[j].strHomeTeam + " vs " + events[j].strAwayTeam : ""]);
  }
  sheet.getRange("I2:I8").setValues(matchesToFill);
  Logger.log("Reset complete! Round " + round);
}

// Entry point for the Web App
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Liga HaShemesh')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fetches all app data from the sheet - called on page load
function getAppData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var round = sheet.getRange("N1").getValue();
  var players = sheet.getRange("B1:G1").getValues()[0];
  var matches = sheet.getRange("I2:I8").getValues().map(function(r) { return r[0]; });
  var results = sheet.getRange("A2:A8").getValues().map(function(r) { return r[0]; });
  var guesses = sheet.getRange("B2:G8").getValues();
  var scores = sheet.getRange("K2:K7").getValues().map(function(r) { return r[0]; });
  var playerNames = sheet.getRange("L2:L7").getValues().map(function(r) { return r[0]; });
  var logosData = sheet.getRange("A20:B40").getValues();
  var logos = {};
  logosData.forEach(function(row) {
    if (row[0]) logos[row[0]] = row[1];
  });

  var passwords = sheet.getRange("AG2:AG7").getValues().map(function(r) { return r[0]; });

  // Top scorers from column Z
  var topScorersData = sheet.getRange("Z3:AA12").getValues();
  var topScorers = [];
  for (var i = 0; i < topScorersData.length; i++) {
    if (topScorersData[i][0]) {
      topScorers.push({ name: topScorersData[i][0], goals: topScorersData[i][1] });
    }
  }

  // Top assists from column AB
  var topAssistsData = sheet.getRange("AB3:AC12").getValues();
  var topAssists = [];
  for (var i = 0; i < topAssistsData.length; i++) {
    if (topAssistsData[i][0]) {
      topAssists.push({ name: topAssistsData[i][0], assists: topAssistsData[i][1] });
    }
  }

  // Goals + assists combined from column AD
  var topGoalsAssistsData = sheet.getRange("AD3:AE12").getValues();
  var topGoalsAssists = [];
  for (var i = 0; i < topGoalsAssistsData.length; i++) {
    if (topGoalsAssistsData[i][0]) {
      topGoalsAssists.push({ name: topGoalsAssistsData[i][0], total: topGoalsAssistsData[i][1] });
    }
  }

  // League table from columns Q-X
  var leagueTableData = sheet.getRange("Q2:X15").getValues();
  var leagueTable = leagueTableData.filter(function(row) {
    return row[0] !== "" && row[0] !== 0;
  }).map(function(row) {
    return {
      position: row[0],
      team: row[1],
      played: row[2],
      wins: row[3],
      draws: row[4],
      losses: row[5],
      goals: row[6],
      points: row[7]
    };
  });

  return {
    round: round,
    players: players,
    matches: matches,
    results: results,
    guesses: guesses,
    scores: scores,
    playerNames: playerNames,
    logos: logos,
    leagueTable: leagueTable,
    topScorers: topScorers,
    topAssists: topAssists,
    topGoalsAssists: topGoalsAssists,
    passwords: passwords
  };
}

// Fetches the first match time from the API for the countdown timer
function getFirstMatchTime() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var round = sheet.getRange("N1").getValue();
  try {
    var apiKey = "YOUR_API_KEY";
    var url = "https://www.thesportsdb.com/api/v1/json/" + apiKey + "/eventsround.php?id=4644&r=" + round + "&s=2025-2026";
    var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    var json = JSON.parse(response.getContentText());
    var events = json.events;
    if (events && events.length > 0) {
      var times = events
        .filter(function(e) { return e.dateEvent && e.strTime; })
        .map(function(e) { return e.dateEvent + "T" + e.strTime; })
        .sort();
      return times[0];
    }
  } catch(e) {
    Logger.log("Error: " + e);
  }
  return null;
}

// Saves a player's guesses to their column in the sheet
function saveGuesses(playerIndex, guesses) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var col = playerIndex + 2;
  for (var i = 0; i < guesses.length; i++) {
    sheet.getRange(i + 2, col).setValue(guesses[i]);
  }
  return "Saved!";
}

// Saves team logos to the sheet - run once to initialize
function saveLogosToSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  var logos = {
    "Maccabi Bnei Raina": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Jerusalem": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Beitar Jerusalem": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Ironi Tiberias": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Be'er Sheva": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Petah Tikva": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Ironi Kiryat Shmona": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Bnei Sakhnin": "LOGO_API_URL"; // Replace with your logo API endpoint 
    "FC Ashdod": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Maccabi Netanya": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Haifa": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Maccabi Tel Aviv": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Tel-Aviv": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Maccabi Haifa": "LOGO_API_URL"; // Replace with your logo API endpoint
  };
  var row = 20;
  var col = 1;
  Object.keys(logos).forEach(function(team) {
    sheet.getRange(row, col).setValue(team);
    sheet.getRange(row, col + 1).setValue(logos[team]);
    row++;
  });

  Logger.log("Logos saved successfully!");
}

// Fetches and saves the league standings from an external football API
function updateLeagueTable() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var url = "STANDINGS_API_URL"; // Replace with your standings API endpoint
  var response = UrlFetchApp.fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    muteHttpExceptions: true
  });
  var json = JSON.parse(response.getContentText());
  var rows = json.standings[0].rows;

  sheet.getRange("P1").setValue("League Table");
  var headers = ["Position", "Team", "P", "W", "D", "L", "Goals", "Pts"];
  sheet.getRange(1, 17, 1, 8).setValues([headers]);

  rows.forEach(function(row) {
    var rowData = [
      row.position,
      row.team.name,
      row.matches,
      row.wins,
      row.draws,
      row.losses,
      "'" + row.scoresFor + ":" + row.scoresAgainst,
      row.points
    ];
    sheet.getRange(row.position + 1, 17, 1, 8).setValues([rowData]);
  });

  Logger.log("League table updated!");
}

// Adds alternate team name mappings for logo display consistency
function addLogoMappings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  var extras = {
    "Hapoel Tel Aviv": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Ironi Dorot Tiberias": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Ashdod SC": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Maccabi Bney Reine": "LOGO_API_URL"; // Replace with your logo API endpoint
    "Hapoel Petach Tikva": "LOGO_API_URL"; // Replace with your logo API endpoint
  };

  var row = 34;
  Object.keys(extras).forEach(function(team) {
    sheet.getRange(row, 1).setValue(team);
    sheet.getRange(row, 2).setValue(extras[team]);
    row++;
  });

  Logger.log("Logo mappings saved!");
}

// Fetches and saves top scorers, assists, and combined stats from an external football API
function updateTopScorers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var url = "STATS_API_URL"; // Replace with your stats API endpoint
  var response = UrlFetchApp.fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "STATS_API_REFERER"
    },
    muteHttpExceptions: true
  });
  var json = JSON.parse(response.getContentText());
  var stats = json.stats.athletesStats;

  // Goals - column Z
  var goals = stats[0].rows;
  sheet.getRange("Z1").setValue("Top Scorers");
  sheet.getRange("Z2").setValue("Name");
  sheet.getRange("AA2").setValue("Goals");
  for (var i = 0; i < Math.min(10, goals.length); i++) {
    sheet.getRange(i + 3, 26).setValue(goals[i].entity.shortName);
    sheet.getRange(i + 3, 27).setValue(goals[i].stats[0].value);
  }

  // Assists - column AB
  var assists = stats[2].rows;
  sheet.getRange("AB1").setValue("Top Assists");
  sheet.getRange("AB2").setValue("Name");
  sheet.getRange("AC2").setValue("Assists");
  for (var j = 0; j < Math.min(10, assists.length); j++) {
    sheet.getRange(j + 3, 28).setValue(assists[j].entity.shortName);
    sheet.getRange(j + 3, 29).setValue(assists[j].stats[0].value);
  }

  // Goals + Assists - column AD
  var goalsAssists = stats[4].rows;
  sheet.getRange("AD1").setValue("Goals + Assists");
  sheet.getRange("AD2").setValue("Name");
  sheet.getRange("AE2").setValue("Total");
  for (var k = 0; k < Math.min(10, goalsAssists.length); k++) {
    sheet.getRange(k + 3, 30).setValue(goalsAssists[k].entity.shortName);
    sheet.getRange(k + 3, 31).setValue(goalsAssists[k].stats[0].value);
  }

  Logger.log("Player stats updated!");
}

// Creates daily triggers at 23:00 Israel time - run once to initialize
function createExactTriggers() {
  ScriptApp.newTrigger('updateLiveResults')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .inTimezone('Asia/Jerusalem')
    .create();
    
  ScriptApp.newTrigger('updateLeagueTable')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .inTimezone('Asia/Jerusalem')
    .create();

  ScriptApp.newTrigger('updateTopScorers')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .inTimezone('Asia/Jerusalem')
    .create();
}

// Verifies existing password or saves a new one for first-time users
function verifyOrSetPassword(playerIndex, inputPassword) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var savedPassword = sheet.getRange(playerIndex + 2, 33).getValue().toString();
  
  if (savedPassword.length === 6) {
    // Password exists - verify it
    return inputPassword.toString() === savedPassword ? "ok" : "wrong";
  } else {
    // No password set - save the new one
    if (inputPassword.toString().length !== 6) return "invalid";
    sheet.getRange(playerIndex + 2, 33).setValue(inputPassword);
    return "new";
  }
}
