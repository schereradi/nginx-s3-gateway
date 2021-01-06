#!env njs

/*
 *  Copyright 2020 F5 Networks
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import s3gateway from "include/s3gateway.js";

var fakeRequest = {
    "remoteAddress" : "172.17.0.1",
    "headersIn" : {
        "Connection" : "keep-alive",
        "Accept-Encoding" : "gzip, deflate",
        "Accept-Language" : "en-US,en;q=0.7,ja;q=0.3",
        "Host" : "localhost:8999",
        "User-Agent" : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:79.0) Gecko/20100101 Firefox/79.0",
        "DNT" : "1",
        "Cache-Control" : "max-age=0",
        "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Upgrade-Insecure-Requests" : "1"
    },
    "uri" : "/a/c/ramen.jpg",
    "method" : "GET",
    "httpVersion" : "1.1",
    "headersOut" : {},
    "args" : {
        "foo" : "bar"
    },
    "status" : 0
};

fakeRequest.log = function(msg) {
    console.log(msg);
}

function testPad() {
    var padSingleDigit = s3gateway._padWithLeadingZeros(3, 2);
    var expected = '03';

    if (padSingleDigit !== expected) {
        throw 'Single digit 3 was not padded with leading zero.\n' +
        'Actual:   ' + padSingleDigit + '\n' +
        'Expected: ' + expected;
    }
}

function testEightDigitDate() {
    var timestamp = new Date('2020-08-03T02:01:09.004Z');
    var eightDigitDate = s3gateway._eightDigitDate(timestamp);
    var expected = '20200803';

    if (eightDigitDate !== expected) {
        throw 'Eight digit date was not created correctly.\n' +
        'Actual:   ' + eightDigitDate + '\n' +
        'Expected: ' + expected;
    }
}

function testAmzDatetime() {
    var timestamp = new Date('2020-08-03T02:01:09.004Z');
    var eightDigitDate = s3gateway._eightDigitDate(timestamp);
    var amzDatetime = s3gateway._amzDatetime(timestamp, eightDigitDate);
    var expected = '20200803T020109Z';

    if (amzDatetime !== expected) {
        throw 'Amazon date time was not created correctly.\n' +
        'Actual:   [' + amzDatetime + ']\n' +
        'Expected: [' + expected + ']';
    }
}

function testSplitCachedValues() {
    var eightDigitDate = "20200811"
    var kSigningHash = "{\"type\":\"Buffer\",\"data\":[164,135,1,191,232,3,16,62,137,5,31,85,175,34,151,221,118,120,59,188,235,94,180,22,218,183,30,14,173,203,196,246]}"
    var cached = eightDigitDate + ":" + kSigningHash;
    var fields = s3gateway._splitCachedValues(cached);

    if (fields.length !== 2) {
        throw 'Unexpected array length returned.\n' +
        'Actual:   [' + fields.length + ']\n' +
        'Expected: [2]';
    }

    if (fields[0] !== eightDigitDate) {
        throw 'Eight digit date field not extracted correctly.\n' +
        'Actual:   [' + fields[0] + ']\n' +
        'Expected: [' + eightDigitDate + ']';
    }

    if (fields[1] !== kSigningHash) {
        throw 'kSigningHash field not extracted correctly.\n' +
        'Actual:   [' + fields[1] + ']\n' +
        'Expected: [' + kSigningHash + ']';
    }
}

function testBuildSigningKeyHashWithReferenceInputs() {
    var kSecret = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
    var date = '20150830';
    var service = 'iam';
    var region = 'us-east-1';
    var expected = 'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9';
    var signingKeyHash = s3gateway._buildSigningKeyHash(kSecret, date, service, region).toString('hex');

    if (signingKeyHash !== expected) {
        throw 'Signing key hash was not created correctly.\n' +
        'Actual:   [' + signingKeyHash + ']\n' +
        'Expected: [' + expected + ']';
    }
}

function testBuildSigningKeyHashWithTestSuiteInputs() {
    var kSecret = 'pvgoBEA1z7zZKqN9RoKVksKh31AtNou+pspn+iyb';
    var date = '20200811';
    var service = 's3';
    var region = 'us-west-2';
    var expected = 'a48701bfe803103e89051f55af2297dd76783bbceb5eb416dab71e0eadcbc4f6';
    var signingKeyHash = s3gateway._buildSigningKeyHash(kSecret, date, service, region).toString('hex');

    if (signingKeyHash !== expected) {
        throw 'Signing key hash was not created correctly.\n' +
        'Actual:   [' + signingKeyHash + ']\n' +
        'Expected: [' + expected + ']';
    }
}

function _runSignatureV4(r) {
    r.log = function(msg) {
        console.log(msg);
    }
    var timestamp = new Date('2020-08-11T19:42:14Z');
    var eightDigitDate = s3gateway._eightDigitDate(timestamp);
    var amzDatetime = s3gateway._amzDatetime(timestamp, eightDigitDate);
    var bucket = 'ez-test-bucket-1'
    var secret = 'pvgoBEA1z7zZKqN9RoKVksKh31AtNou+pspn+iyb'
    var region = 'us-west-2';
    var server = 's3-us-west-2.amazonaws.com';

    var expected = 'cf4dd9e1d28c74e2284f938011efc8230d0c20704f56f67e4a3bfc2212026bec';
    var signature = s3gateway._buildSignatureV4(r, amzDatetime, eightDigitDate, bucket, secret, region, server);

    if (signature !== expected) {
        throw 'V4 signature hash was not created correctly.\n' +
        'Actual:   [' + signature + ']\n' +
        'Expected: [' + expected + ']';
    }
}

function testSignatureV4() {
    // Note: since this is a read-only gateway, host, query parameters and all
    // client headers will be ignored.
    var r = {
        "remoteAddress" : "172.17.0.1",
        "headersIn" : {
            "Connection" : "keep-alive",
            "Accept-Encoding" : "gzip, deflate",
            "Accept-Language" : "en-US,en;q=0.7,ja;q=0.3",
            "Host" : "localhost:8999",
            "User-Agent" : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:79.0) Gecko/20100101 Firefox/79.0",
            "DNT" : "1",
            "Cache-Control" : "max-age=0",
            "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Upgrade-Insecure-Requests" : "1"
        },
        "uri" : "/a/c/ramen.jpg",
        "method" : "GET",
        "httpVersion" : "1.1",
        "headersOut" : {},
        "args" : {
            "foo" : "bar"
        },
        "variables" : {
            "uri_path": "/a/c/ramen.jpg"
        },
        "status" : 0
    };

    _runSignatureV4(r);
}

function testSignatureV4Cache() {
    // Note: since this is a read-only gateway, host, query parameters and all
    // client headers will be ignored.
    var r = {
        "remoteAddress" : "172.17.0.1",
        "headersIn" : {
            "Connection" : "keep-alive",
            "Accept-Encoding" : "gzip, deflate",
            "Accept-Language" : "en-US,en;q=0.7,ja;q=0.3",
            "Host" : "localhost:8999",
            "User-Agent" : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:79.0) Gecko/20100101 Firefox/79.0",
            "DNT" : "1",
            "Cache-Control" : "max-age=0",
            "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Upgrade-Insecure-Requests" : "1"
        },
        "uri" : "/a/c/ramen.jpg",
        "method" : "GET",
        "httpVersion" : "1.1",
        "headersOut" : {},
        "args" : {
            "foo" : "bar"
        },
        "variables": {
            "cache_signing_key_enabled": 1,
            "uri_path": "/a/c/ramen.jpg"
        },
        "status" : 0
    };

    _runSignatureV4(r);

    if (!"signing_key_hash" in r.variables) {
        throw "Hash key not written to r.variables.signing_key_hash";
    }

    _runSignatureV4(r);
}

function test() {
    testPad();
    testEightDigitDate();
    testAmzDatetime();
    testSplitCachedValues();
    testBuildSigningKeyHashWithReferenceInputs();
    testBuildSigningKeyHashWithTestSuiteInputs();
    testSignatureV4();
    testSignatureV4Cache();
}

test();
