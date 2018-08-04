(function () {
  var Game = function (canvasID) {
    let canvas = document.getElementById(canvasID)

    this.screen = canvas.getContext('2d')
    this.size = { x: canvas.width, y: canvas.height }

    this.score = 0
    this.alive = true
    this.active = false

    this.keyboard = new Keyboard()
    this.player = new Player(this)
    this.ball = new Ball(this, this.player)

    let brickSize = { x: 30, y: 16 }
    let brickPadding = 6
    this.bricks = createBricks(this, brickSize, brickPadding)

    this.start()

    let self = this
    function run () {
      if (self.alive) {
        self.update(brickSize)
        window.requestAnimationFrame(run)
      }
    }

    run()
  }

  Game.prototype = {
    start: function () {
      for (let i = 1; i < this.player.lives + 1; i++) {
        document.getElementById(`life-${i}`).setAttribute('style', 'color: #000000')
      }
      this.player.die()
    },

    update: function (brickSize) {
      this.screen.clearRect(0, 0, this.size.x, this.size.y)

      this.screen.fillStyle = '#F9F3EC'
      this.screen.fillRect(0, 0, this.size.x, this.size.y)

      this.screen.fillStyle = '#FFFFFF'
      this.screen.fillRect(6, 6, brickSize.x * 16 + 12, brickSize.y * 16 + 12)

      this.player.update(this.keyboard)
      drawRect(this.screen, this.player.center, this.player.size, this.player.color)

      this.ball.update(this.keyboard)
      if (this.alive) {
        drawRect(this.screen, this.ball.center, this.ball.size)
      }

      for (let i = 0; i < this.bricks.length; i++) {
        drawRect(this.screen, this.bricks[i].center, this.bricks[i].size, this.bricks[i].color, this.bricks[i].padding)
      }

      displayCurrentScore(this.bricks.length)
    },

    reset: function () {
      this.active = false
      this.ball = new Ball(this, this.player)
    },

    end: function () {
      this.alive = false
    }
  }

  var Player = function (game) {
    this.game = game
    this.lives = 5
    this.size = { x: 60, y: 10 }
    this.center = { x: game.size.x / 2, y: game.size.y - 10 }
    this.speed = 5
    this.color = '#000000'
  }

  Player.prototype = {
    update: function (keyboard) {
      if (keyboard.isDown(keyboard.KEYS.LEFT)) {
        this.center.x = Math.max(this.center.x - this.speed, this.size.x / 2)
      } else if (keyboard.isDown(keyboard.KEYS.RIGHT)) {
        this.center.x = Math.min(this.center.x + this.speed, this.game.size.x - this.size.x / 2)
      }
    },

    die: function () {
      if (this.lives > 0) {
        document.getElementById(`life-${this.lives}`).setAttribute('style', 'color: #ffffff')
      }
      this.lives -= 1
    }
  }

  var Ball = function (game, player) {
    this.game = game
    this.player = player
    this.hit = false
    this.size = { x: 5, y: 5 }
    this.center = {
      x: player.center.x,
      y: player.center.y - player.size.y * 2
    }
    this.velocity = {
      x: Math.sign(Math.random() - 0.5) * 3,
      y: -2
    }
  }

  Ball.prototype = {
    launch: function () {
      this.game.active = true
    },

    update: function (keyboard) {
      if (keyboard.isDown(keyboard.KEYS.SPACE) && !this.game.active) {
        this.launch()
      } else if (!this.game.active) {
        this.center = {
          x: this.player.center.x,
          y: this.player.center.y - this.player.size.y * 2
        }
        return
      }

      let hit = false
      if (this.hit) {
        // wait until ball is clear of objects to re-start registering collisions
      } else if (this.hitFloor()) {
        this.player.die()
        if (this.player.lives < 0) {
          this.game.end()
        } else {
          this.game.reset()
        }
        return
      } else if (this.hitWall()) {
        hit = true
        this.velocity.x *= -1
      } else if (this.hitCeiling()) {
        hit = true
        this.velocity.y *= -1
      } else if (colliding(this, this.player)) {
        hit = true
        this.velocity.y *= -1
        if (Math.abs(this.center.x - this.player.center.x) < 15) {
          //
        } else if ((this.center.x - this.player.center.x) * this.velocity.x > 0) {
          this.velocity.x *= 1.2
        } else {
          this.velocity.x *= -0.8
        }
      } else {
        for (var i = 0; i < this.game.bricks.length; i++) {
          if (colliding(this, this.game.bricks[i])) {
            hit = true
            let hitBrick = this.game.bricks[i]

            let collisionAngle = Math.atan((hitBrick.center.y - this.center.y) / (hitBrick.center.x - this.center.y))
            let referenceAngle = Math.atan(hitBrick.size.y / hitBrick.size.x)

            if (Math.abs(collisionAngle) > Math.abs(referenceAngle)) {
              let v = this.velocity
              this.velocity.x *= -1
              console.log('hit side', v, this.velocity)
            } else {
              this.velocity.y *= -1
            }

            this.game.bricks.splice(i, 1)
            removeRect(this.game.screen, hitBrick.center, hitBrick.size)
            break
          }
        }
      }

      this.hit = hit

      this.center = {
        x: this.center.x + this.velocity.x,
        y: this.center.y + this.velocity.y
      }
    },

    hitFloor: function () {
      return (this.center.y >= this.player.center.y)
    },

    hitWall: function () {
      return ((this.center.x <= this.size.x / 2) ||
              (this.center.x + this.size.x / 2 >= this.game.size.x))
    },

    hitCeiling: function () {
      return (this.center.y <= this.size.y / 2)
    }
  }

  var Brick = function (game, center) {
    let color = new HSL()
    color.randomize()
    this.color = color.formatCSS()
    this.size = { x: 30, y: 16 }
    this.padding = 6
    this.center = center
  }

  var createBricks = function (game, brickSize, brickBorder) {
    let bricks = []

    let width = 16
    let height = 16

    let x = 2 * brickBorder + brickSize.x / 2
    let y = 2 * brickBorder + brickSize.y / 2

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        bricks.push(new Brick(game, { x: x, y: y }))
        x += brickSize.x
      }
      x = 2 * brickBorder + brickSize.x / 2
      y += brickSize.y
    }
    return bricks
  }

  var Keyboard = function () {
    var keyState = {}

    window.onkeydown = function (e) {
      if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', function (e) {
      keyState[e.keyCode] = true
    })

    window.addEventListener('keyup', function (e) {
      keyState[e.keyCode] = false
    })

    this.isDown = function (keyCode) {
      return keyState[keyCode] === true
    }

    this.KEYS = { LEFT: 37, RIGHT: 39, SPACE: 32 }
  }

  function colliding (b1, b2) {
    return !(
      b1 === b2 ||
      b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
      b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
      b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
      b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2
    )
  }

  function drawRect (screen, center, size, color = '#000000', padding = 0) {
    screen.fillStyle = color
    screen.fillRect(center.x - size.x / 2 + padding / 2,
                    center.y - size.y / 2 + padding / 2,
                    size.x - padding,
                    size.y - padding)
  }

  function removeRect (screen, center, size) {
    screen.clearRect(center.x - size.x / 2,
                     center.y - size.y / 2,
                     size.x, size.y)
  }

  function displayCurrentScore (numBricks) {
    document.getElementById('label-title').textContent = `${numBricks} Farbe${numBricks === 1 ? '' : 'n'}`
  }

  var HSL = function (h = 360, s = 100, l = 100) {
    this.hue = h
    this.saturation = s
    this.lightness = l
  }

  HSL.prototype = {
    randomize: function (sMultiplier = 90, lMultiplier = 60) {
      this.hue = Math.random() * 360
      this.saturation = 10 + Math.random() * sMultiplier
      this.lightness = 20 + Math.random() * lMultiplier
    },

    formatCSS: function () {
      return `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`
    },

    getComplement: function () {
      let hue = (this.hue + 180) % 360
      let saturation = this.saturation
      let lightness = (this.lightness + 25) % 100
      if (lightness < 20) {
        lightness += 20
      }
      return new HSL(hue, saturation, lightness)
    }
  }

  function changeLinkHoverColor (color) {
    let css = `a:hover { color: ${color}; }`
    let style = document.createElement('style')

    if (style.styleSheet) {
      style.styleSheet.cssText = css
    } else {
      style.appendChild(document.createTextNode(css))
    }

    document.getElementsByTagName('head')[0].appendChild(style)
  }

  function randomizeColors () {
    let backgroundColor = new HSL()
    backgroundColor.randomize(70)
    let hrefColor = backgroundColor.getComplement()

    changeLinkHoverColor(hrefColor.formatCSS())
    document.body.setAttribute('style', 'background-color: ' + backgroundColor.formatCSS())
  }

  window.onload = function () {
    let game = new Game('screen')
    randomizeColors()

    document.getElementById('new-colors').onclick = function () {
      randomizeColors()
    }

    document.getElementById('new-game').onclick = function () {
      game.end()
      setTimeout(function () {
        game = new Game('screen')
        randomizeColors()
      }, 1000)
    }
  }
})()
