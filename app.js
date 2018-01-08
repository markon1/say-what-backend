var express = require('express'),
    bodyParser = require('body-parser'),
    mysql = require('mysql'),
    app = express();

let port = process.env.PORT;
let author_password = process.env.AUTHOR_PASSWORD;
let dburl = process.env.CLEARDB_DATABASE_URL.replace('mysql://', "").replace('?reconnect=true', '');

let pool = mysql.createPool({
    multipleStatements: true,
    connectionLimit: 5,
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
        updatePage(req.body.pageURL, req.body.paragraphs);
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
                        connection.query("INSERT INTO pages (url,currentVersion) VALUES (?)", [
                            [url, 1]
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

function updatePage(url, paragraphs) {
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
                        connection.query("INSERT INTO pages (url,currentVersion) VALUES (?)", [
                            [url, 1]
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
                        connection.query("UPDATE pages SET currentVersion = ? WHERE url = ?", [parseInt(results[0].currentVersion) + 1, url], function (err, results) {
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
                        connection.query("INSERT INTO paragraphs (paragraphContent,pageURL) VALUES (?)", [
                            [com.paragraphContent, com.url]
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
            connection.query("INSERT INTO comments (comment,rating,position,pageVersion,url,pageName,date,paragraphID) VALUES (?)", [
                [com.comment, !!com.rating ? com.rating : null, com.position, pageVersion, com.url, /[^/]*$/.exec(com.url)[0], formattedDate, paragraphID]
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
            connection.query("UPDATE comments SET comment = ?,rating = ?,position = ?,date = ? WHERE commentID = " + com.id, [
                com.comment, com.rating, com.position, formattedDate
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
    console.log(pageURL);
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("Could not get connection from pool");
            console.error(err);
        } else {
            connection.query("SELECT * FROM comments c JOIN paragraphs p ON c.paragraphID = p.paragraphID WHERE c.url = ?", [pageURL], function (err, results) {
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

app.listen(port);
console.log('Server started! At http://localhost:' + port);
