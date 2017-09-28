/*  ------------------------------------------------------------------------ */

const ccxt     = require ('../ccxt')
    , assert   = require ('assert')
    , log      = require ('ololog')
    , ansi     = require ('ansicolor').nice;

/*  ------------------------------------------------------------------------ */

describe ('ccxt base code', () => {

    it ('sleep() is robust', async () => {

        for (let i = 0; i < 30; i++) {
            const before = Date.now ()
            await ccxt.sleep (10)
            const now = Date.now ()
            const elapsed = now - before
            assert (elapsed >= 9) // not too fast
            assert (elapsed < 20) // but not too slow either...
        }
    })

    it ('calculateFee() works', () => {

        const price  = 100.00
        const amount = 10.00
        const taker  = 0.0025
        const maker  = 0.0010
        const fees   = { taker, maker }
        const market = {
            'id':     'foobar',
            'symbol': 'FOO/BAR',
            'base':   'FOO',
            'quote':  'BAR',
            'taker':   taker,
            'maker':   maker,
        }

        const exchange = new ccxt.Exchange ({
            'id': 'mock',
            'markets': {
                'FOO/BAR': market,
            },
        })

        Object.keys (fees).forEach (takerOrMaker => {

            const result = exchange.calculateFee (market['symbol'], 'limit', 'sell', amount, price, takerOrMaker, {})

            assert.deepEqual (result, {
                'currency': 'BAR',
                'rate': fees[takerOrMaker],
                'cost': fees[takerOrMaker] * amount * price,
            })
        })
    })

    it ('rate limiting works', async () => {

        const calls = []
        const rateLimit = 100
        const exchange = new ccxt.Exchange ({

            id: 'mock',
            rateLimit,
            enableRateLimit: true,

            async executeRestRequest (...args) { calls.push ({ when: Date.now (), path: args[0], args }) }
        })

        await exchange.fetch ('foo')
        await exchange.fetch ('bar')
        await exchange.fetch ('baz')

        await Promise.all ([
            exchange.fetch ('qux'),
            exchange.fetch ('zap'),
            exchange.fetch ('lol')
        ])

        assert.deepEqual (calls.map (x => x.path), ['foo', 'bar', 'baz', 'qux', 'zap', 'lol'])

        calls.reduce ((prevTime, call) => {
            // log ('delta T:', call.when - prevTime)
            assert ((call.when - prevTime) >= (rateLimit - 1))
            return call.when
        }, 0)
    })

    it ('aggregate() works', () => {

        const bids = [
            [ 789.1, 123.0 ],
            [ 123.0, 456.0 ],
            [ 789.0, 123.0 ],
            [ 789.10, 123.0 ],
        ]

        const asks = [
            [ 123.0, 456.0 ],
            [ 789.0, 123.0 ],
            [ 789.10, 123.0 ],
        ]

        assert.deepEqual (ccxt.aggregate (bids.sort ()), [
            [ 123.0, 456.0 ],
            [ 789.1, 246.0 ],
            [ 789.0, 123.0 ],
        ].sort ())

        assert.deepEqual (ccxt.aggregate (asks.sort ()), [
            [ 123.0, 456.0 ],
            [ 789.0, 123.0 ],
            [ 789.10, 123.0 ],
        ].sort ())
    })

    it ('groupBy() works', () => {

        const array = [
            { 'foo': 'a' },
            { 'foo': 'b' },
            { 'foo': 'c' },
            { 'foo': 'b' },
            { 'foo': 'c' },
            { 'foo': 'c' },
        ]

        assert.deepEqual (ccxt.groupBy (array, 'foo'), {
            'a': [ { 'foo': 'a' } ],
            'b': [ { 'foo': 'b' }, { 'foo': 'b' } ],
            'c': [ { 'foo': 'c' }, { 'foo': 'c' }, { 'foo': 'c' } ],
        })
    })
})

/*  ------------------------------------------------------------------------ */
