/**
 * @file   http transfrom stream
 * @author wxp201013@163.com
 * @see Thanks to https://github.com/philippotto/transformer-proxy
 */

import zlib from 'zlib'
import stream from 'stream'

class TransformerStream extends stream {
    constructor(options, req, res) {
        super()

        this.options = options

        this.req = req

        this.res = res

        this.readable = true

        this.writable = true

        this.isGzip = false

        this.chunks = []

        this.contentType = ''
    }

    write(data) {
        this.chunks.push(data)
    }

    end() {
        let options = this.options

        let data = Buffer.concat(this.chunks)

        options.forEach(o => {
            let identityOrTransformer = (
                o.match && o.match.test(o.url)
                && o.type && this.contentType
                && this.contentType.indexOf(o.type) > -1
            ) ? o.responseCallback : function (data) {
                return data
            }

            try {
                data = identityOrTransformer(data, this.req, this.res)
            }

            catch (e) {
                console.log('eval script run error!')
            }
        })

        this.emit('data', data)

        return data
    }
}

export default function (options = [], req, res) {
    let transformerStream = new TransformerStream(options, req, res)

    let resEnd = res.end.bind(res);
    let resWrite = res.write.bind(res);
    let resWriteHead = res.writeHead.bind(res);

    res.write = function (data, encoding = 'utf-8') {
        transformerStream.write(data, encoding);
    };

    res.end = function (data, encoding = 'utf-8') {
        return transformerStream.end(data, encoding);
    };

    transformerStream.on('data', chunks => {
        if (transformerStream.isGzip)  {
            zlib.gzip(chunks, (err, buffer) => {
                if (err) {
                    buffer = 'Transformer Gzip Error!'
                }

                resWrite(buffer)
                resEnd()
            })
        }

        else {
            resWrite(chunks)
            resEnd()
        }
    });

    res.writeHead = function (code, headers) {
        res.removeHeader('Content-Length')

        transformerStream.contentType = headers && headers['content-type']

        transformerStream.isGzip = /gzip/i.test(headers && headers['content-encoding'])

        if (options.headers) {
            options.headers.forEach(header => {
                if (header.value) {
                    res.setHeader(header.name, header.value);
                }
                else {
                    res.removeHeader(header.name);
                }
            })
        }

        headers && delete headers['content-length']
        /* eslint-disable */
        resWriteHead.apply(null, arguments)
        /* eslint-enable */
    }
}
