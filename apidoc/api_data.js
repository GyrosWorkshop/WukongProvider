define({ "api": [
  {
    "type": "POST",
    "url": "/api/searchSongs",
    "title": "search songs",
    "name": "SearchSongs",
    "group": "API",
    "description": "<p>To simplify our provider implementation, only title, artist, album are required.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>search keyword</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n    {\n    }\n]",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 ERROR\n{\n    \"error\": \"IllegalArgumentException \\\"key\\\" not exist or wrong type.\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/index.ts",
    "groupTitle": "API"
  },
  {
    "type": "POST",
    "url": "/api/songInfo",
    "title": "songInfo",
    "name": "songInfo",
    "group": "API",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "siteId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "songId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": true,
            "field": "withFileUrl",
            "defaultValue": "false",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "clientIP",
            "description": "<p>This is used to route overseas users to proxy server.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/index.ts",
    "groupTitle": "API"
  }
] });
