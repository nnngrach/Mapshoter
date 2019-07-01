const express = require( 'express' )
const queue = require('express-queue')


const PORT = process.env.PORT || 5000
const app = express()


// server = require('http').createServer(app),
// server.maxConnections = 2
//
// server.listen( PORT )
// console.log( 'Listening on port ', PORT )


app.listen( PORT, () => {
  console.log( 'Listening on port ', PORT )
})


app.use(queue({ activeLimit: 2, queuedLimit: -1 }));


app.get( '/', async ( req, res, next ) => {
  res.writeHead( 200, {
    'Content-Type': 'text/plain'
  })
  res.end( 'Puppeteer utility for AnyGIS' )
})



// // Для перенаправления пользователя на одно из свободных зеркал
// app.get( '/:x/:y/:z', async ( req, res, next ) => {
//
//   if ( !req.params.x ) return next( error( 400, 'No X paramerer' ))
//   if ( !req.params.y ) return next( error( 400, 'No Y paramerer' ))
//   if ( !req.params.z ) return next( error( 400, 'No Z paramerer' ))
//   if ( !req.query.script ) return next( error( 400, 'No script paramerer' ) )
//
//   const randomValue = randomInt( 1, 31 )
//   //const randomValue = randomInt( 1, 5 )
//   res.redirect(`https://mapshoter${randomValue}.herokuapp.com/overpass/${req.params.x}/${req.params.y}/${req.params.z}?script=${req.query.script}`)
//   console.log(`https://mapshoter${randomValue}.herokuapp.com/overpass/${req.params.x}/${req.params.y}/${req.params.z}?script=${req.query.script}`)
//   })




// Для непосредственной загрузки тайла
app.get( '/:mode/:x/:y/:z', async ( req, res, next ) => {

  const x = req.params.x
  const y = req.params.y
  const z = req.params.z

  console.log(new Date().getTime() / 1000, ' - R app get', z, x, y)

  if ( !isInt( x )) return next( error( 400, 'X must must be Intager' ))
  if ( !isInt( y )) return next( error( 400, 'Y must must be Intager' ))
  if ( !isInt( z )) return next( error( 400, 'Z must must be Intager' ))


  // Выбираем режим обработки карты
  switch ( req.params.mode ) {

    // API для растеризации карты с сайта OverpassTurbo.eu
    case 'overpass':

      const worker = require( './Modes/OverpassBase' )

      const scriptName = req.query.script
      if ( !scriptName ) return next( error( 400, 'No script paramerer' ) )

      // Чтобы не перегружать Overpass не будем делать запросы для слишком больших территорий.
      // Просто покажем пустую карту для этих масштабов.
      if ( Number( z ) < 15 ) {
        return res.redirect(`http://tile.openstreetmap.org/${z}/${x}/${y}.png`)
      }


      // Делать все новые и новые попытки, пока тайл не загрузится
      var screenshot
      var isSucces = false
      var counter = 0

      while (!isSucces && counter < 3) {
        counter += 1

        try {
          console.log( new Date().getTime() / 1000, ' - R try',  z, x, y)
          screenshot = await worker.makeTile( Number( x ), Number( y ), Number( z ), scriptName )
          isSucces = true
        } catch (errorMessage) {
          console.log( new Date().getTime() / 1000, ' -- Error',  z, x, y)
          console.log( errorMessage)
        }
      }


      // Отправить пользователю результат
      if (isSucces) {
          console.log(new Date().getTime() / 1000, ' ---- R app res', z, x, y)
          res.writeHead( 200, {
            'Content-Type': 'image/png',
            'Content-Length': screenshot.length
          })
      } else {
          console.log(new Date().getTime() / 1000, ' ---- FAIL', z, x, y)
          screenshot = 'Fetch tile count limit'
          res.writeHead( 501, {
            'Content-Type': 'text/plain',
            'Content-Length': screenshot.length
          })
      }

      return res.end( screenshot )
      break


    default:
      return next( error( 400, 'Unknown mode value' ) )
  }
})







// Вспомогательные функции

function isInt( value ) {
  var x = parseFloat( value )
  return !isNaN( value ) && ( x | 0 ) === x
}


function error( status, msg ) {
  var err = new Error( msg )
  err.status = status
  return err
}

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low)
}

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
