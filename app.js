var express = require('express'),
    bodyParser = require('body-parser'),
    mysql = require('mysql'),
    app = express();

let port = process.env.PORT;
let author_password = process.env.AUTHOR_PASSWORD;
let dburl = process.env.CLEARDB_DATABASE_URL.replace('mysql://', "").replace('?reconnect=true', '');

let pool = mysql.createPool({
    multipleStatements: true,
    connectionLimit: 10,
    host: dburl.split('@')[1].split('/')[0],
    user: dburl.split('@')[0].split(':')[0],
    password: dburl.split('@')[0].split(':')[1],
    database: dburl.split('@')[1].split('/')[1]
});

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies
app.use(function (req, res, next) { // allow all origins
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/updatePage', function (req, res) {
    res.json({
        correct: true
    });
    if (req.body.password == author_password) {
        updatePage(req.body.pageURL, req.body.pageName, req.body.paragraphs);
    }
});

app.post('/checkPassword', function (req, res) {
    if (req.body.password == author_password) {
        res.json({
            correct: true
        });
    } else {
        res.json({
            correct: false
        });
    }
});

app.post('/addComment', function (req, res) {
    let url = req.body.comment.url;
    let pageName = req.body.comment.pageName;

    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT p.currentVersion FROM pages p WHERE p.url = ?", [url], function (err, results) {
                if (err) {
                    console.error("Error while fetching currentVersion from PAGES table");
                    console.error(err);
                    connection.release();
                } else {
                    if (!results.length) {
                        connection.query("INSERT INTO pages (url,pageName,currentVersion) VALUES (?)", [
                            [url, pageName, 1]
                        ], function (err, results) {
                            if (err) {
                                console.error("Error while inserting new page into PAGES table");
                                console.error(err);
                            } else {
                                checkParagraph(req.body.comment, 1, res);
                            }
                            connection.release();
                        });
                    } else {
                        checkParagraph(req.body.comment, results[0].currentVersion, res);
                        connection.release();
                    }
                }
            });
        }
    });
});

app.post('/editComment', function (req, res) {
    editComment(req.body.comment, res);
});

app.post('/deleteComment', function (req, res) {
    deleteComment(req.body.commentID, res);
});

app.post('/getComments', function (req, res) {
    getComments(req.body.pageURL, res);
});

app.post('/getAll', function (req, res) {
    if (req.body.password == author_password) {
        getAll(res);
    }
});

app.post('/getAllCurrent', function (req, res) {
    if (req.body.password == author_password) {
        getAllCurrent(res);
    }
});

app.post('/getCurrentPage', function (req, res) {
    if (req.body.password == author_password) {
        getCurrentPage(req.body.url, res);
    }
});

app.post('/addTime', function (req, res) {
    addTime(req.body,res);
});

function updatePage(url, pageName, paragraphs) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT currentVersion FROM pages WHERE url = ?", [url], function (err, results) {
                if (err) {
                    console.error("Error while fetching currentVersion from PAGES table");
                    console.error(err);
                    connection.release();
                } else {
                    if (!results.length) {
                        connection.query("INSERT INTO pages (url,pageName,currentVersion) VALUES (?)", [
                            [url, pageName, 1]
                        ], function (err, results) {
                            if (err) {
                                console.error("Error while inserting new page into PAGES table");
                                console.error(err);
                                connection.release();
                            } else {
                                connection.query("SELECT * FROM paragraphs p WHERE p.pageURL = ?", [url], function (err, results) {
                                    if (err) {
                                        console.error("Error while fetching paragraphs from PARAGRAPHS table");
                                        console.error(err);
                                        connection.release();
                                    } else {
                                        if (!!results.length) {
                                            let active = [];
                                            let nonActive = [];
                                            for (i = 0; i < results.length; i++) {
                                                if (paragraphs.includes(results[i].paragraphContent)) {
                                                    active.push(results[i].paragraphID);
                                                } else {
                                                    nonActive.push(results[i].paragraphID);
                                                }
                                            }
                                            if (!active.length) {
                                                active.push('');
                                            }
                                            if (!nonActive.length) {
                                                nonActive.push('');
                                            }
                                            connection.query("UPDATE paragraphs SET active = 1 WHERE paragraphID IN (?);UPDATE paragraphs SET active = 0 WHERE paragraphID IN (?)", [
                                                active,
                                                nonActive
                                            ], function (err, results) {
                                                if (err) {
                                                    console.error("Error while updating active status in paragraphs table");
                                                    console.error(err);
                                                }
                                                connection.release();
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        connection.query("UPDATE pages SET currentVersion = ?, pageName = ? WHERE url = ?", [parseInt(results[0].currentVersion) + 1, pageName, url], function (err, results) {
                            if (err) {
                                console.error("Error while inserting new page into PAGES table");
                                console.error(err);
                                connection.release();
                            } else {
                                connection.query("SELECT * FROM paragraphs p WHERE p.pageURL = ?", [url], function (err, results) {
                                    if (err) {
                                        console.error("Error while fetching paragraphs from PARAGRAPHS table");
                                        console.error(err);
                                        connection.release();
                                    } else {
                                        if (!!results.length) {
                                            let active = [];
                                            let nonActive = [];
                                            for (i = 0; i < results.length; i++) {
                                                if (paragraphs.includes(results[i].paragraphContent)) {
                                                    active.push(results[i].paragraphID);
                                                } else {
                                                    nonActive.push(results[i].paragraphID);
                                                }
                                            }
                                            if (!active.length) {
                                                active.push('');
                                            }
                                            if (!nonActive.length) {
                                                nonActive.push('');
                                            }
                                            connection.query("UPDATE paragraphs SET active = 1 WHERE paragraphID IN (?);UPDATE paragraphs SET active = 0 WHERE paragraphID IN (?)", [
                                                active,
                                                nonActive
                                            ], function (err, results) {
                                                if (err) {
                                                    console.error("Error while updating active status in paragraphs table");
                                                    console.error(err);
                                                }
                                                connection.release();
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            });

        }
    });
}

function checkParagraph(com, currentVersion, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT p.paragraphID FROM paragraphs p WHERE p.pageURL = ? AND p.paragraphContent = ?", [com.url, com.paragraphContent], function (err, results) {
                if (err) {
                    console.error("Error while fetching paragraphID from PARAGRAPHS table");
                    console.error(err);
                    connection.release();
                } else {
                    if (!results.length) {
                        connection.query("INSERT INTO paragraphs (paragraphContent,paragraphText,pageURL) VALUES (?)", [
                            [com.paragraphContent, com.paragraphText, com.url]
                        ], function (err, results) {
                            if (err) {
                                console.error("Error while inserting new paragraph into PARAGRAPHS table");
                                console.error(err);
                            } else {
                                addComment(com, currentVersion, results.insertId, res);
                            }
                            connection.release();
                        });
                    } else {
                        addComment(com, currentVersion, results[0].paragraphID, res);
                        connection.release();
                    }
                }
            });
        }
    });
}

function addComment(com, pageVersion, paragraphID, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            let date = new Date(Date.now());
            let formattedDate = parseInt(date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            connection.query("INSERT INTO comments (comment,rating,position,pageVersion,url,pageName,date,paragraphId,paragraphText,paragraphBefore,paragraphAfter) VALUES (?)", [
                [com.comment, !!com.rating ? com.rating : null, com.position, pageVersion, com.url, com.pageName, formattedDate, paragraphID, com.paragraphText, com.paragraphBefore, com.paragraphAfter]
            ], function (err, results) {
                if (err) {
                    console.error("Error while inserting new comment into COMMENTS table");
                    console.error(err);
                } else {
                    console.log(results.insertId);
                    res.json({
                        commentID: results.insertId
                    });
                }
                connection.release();
            });
        }
    });
}

function editComment(com, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            let date = new Date(Date.now());
            let formattedDate = parseInt(date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            connection.query("UPDATE comments SET comment = ?,rating = ?,position = ?,date = ?, paragraphBefore = ?, paragraphAfter = ?, pageName = ? WHERE commentID = " + com.id, [
                com.comment, com.rating, com.position, formattedDate, com.paragraphBefore, com.paragraphAfter, com.pageName
            ], function (err, results) {
                if (err) {
                    console.error("Error while updating comment in COMMENTS table");
                    console.error(err);
                } else {
                    res.json({
                        edited: true
                    });
                }
                connection.release();
            });
        }
    });
}

function deleteComment(commentID, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("DELETE FROM comments WHERE commentID = ?", [commentID], function (err, results) {
                if (err) {
                    console.error("Error while deleting comment from COMMENTS table");
                    console.error(err);
                } else {
                    console.error("Deleted comment with ID: " + commentID);
                    res.json({
                        deleted: true
                    });
                }
                connection.release();
            });
        }
    });
}

function getComments(pageURL, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT * FROM comments c JOIN paragraphs p ON c.paragraphId = p.paragraphID WHERE c.url = ?", [pageURL], function (err, results) {
                if (err) {
                    console.error("Error while fetching comments from COMMENTS table");
                    console.error(err);
                    connection.release();
                } else {
                    res.json({
                        comments: results
                    });
                    connection.release();
                }
            });
        }
    });
}

function getAll(res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT c.commentID,c.comment,c.rating,c.position,c.pageVersion,c.url,c.pageName,c.paragraphId,c.paragraphText,c.paragraphBefore,c.paragraphAfter,p.paragraphContent,p.active FROM comments c JOIN paragraphs p ON c.paragraphId = p.paragraphID", function (err, results) {
                if (err) {
                    console.error("Error while fetching comments from COMMENTS table");
                    console.error(err);
                    connection.release();
                } else {
                    res.json(results);
                    connection.release();
                }
            });
        }
    });
}

function getAllCurrent(res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT c.commentID,c.comment,c.rating,c.position,c.pageVersion,c.url,c.pageName,c.paragraphId,c.paragraphText,c.paragraphBefore,c.paragraphAfter,p.paragraphContent FROM comments c JOIN paragraphs p ON c.paragraphId = p.paragraphID WHERE p.active = 1", function (err, results) {
                if (err) {
                    console.error("Error while fetching comments from COMMENTS table");
                    console.error(err);
                    connection.release();
                } else {
                    res.json(results);
                    connection.release();
                }
            });
        }
    });
}

function getCurrentPage(pageURL, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT c.commentID,c.comment,c.rating,c.position,c.pageVersion,c.url,c.pageName,c.paragraphId,c.paragraphText,c.paragraphBefore,c.paragraphAfter,p.paragraphContent FROM comments c JOIN paragraphs p ON c.paragraphId = p.paragraphID WHERE p.active = 1 AND c.url = ?", [pageURL], function (err, results) {
                if (err) {
                    console.error("Error while fetching comments from COMMENTS table");
                    console.error(err);
                    connection.release();
                } else {
                    res.json(results);
                    connection.release();
                }
            });
        }
    });
}

function addTime(body,res){
    console.log(body);
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("INSERT INTO visits SET userID=?,pageURL=?,secondsSpent=? ON DUPLICATE KEY UPDATE secondsSpent=secondsSpent+?", [body.userID,body.pageURL,body.secondsSpent,body.secondsSpent], function (err, results) {
                if (err) {
                    console.error("Error while inserting into VISITS table");
                    console.error(err);
                    connection.release();
                } else {
                    connection.query("SELECT MAX(secondsSpent) AS max,MIN(secondsSpent) AS min,AVG(secondsSpent) AS avg,STDDEV(secondsSpent) AS stddev FROM visits WHERE pageURL = ?", [body.pageURL], function (err, results) {
                        if (err) {
                            console.error("Error while getting info from VISITS table");
                            console.error(err);
                            connection.release();
                        } else {
                            let times = results[0];
                            connection.query("INSERT INTO pages (url,currentVersion,pageName,minTime,maxTime,averageTime,standardDeviation) VALUES (?) ON DUPLICATE KEY UPDATE pageName=VALUES(pageName),minTime=VALUES(minTime),maxTime=VALUES(maxTime),averageTime=VALUES(averageTime),standardDeviation=VALUES(standardDeviation)", [[body.pageURL,1,body.pageName,times.min,times.max,times.avg,times.stddev]], function (err, results) {
                                if (err) {
                                    console.error("Error while getting info from VISITS table");
                                    console.error(err);
                                    connection.release();
                                } else {
                                    res.json({ok:true});
                                    connection.release();
                                }
                            });
                        }
                    });
                }
            });
        }
    });    
}

app.listen(port);
console.log('Server started! At http://localhost:' + port);
