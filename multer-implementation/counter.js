import EventEmitter from "events"

function Counter () {
  EventEmitter.call(this)
  this.value = 0
}

Counter.prototype = Object.create(EventEmitter.prototype)

Counter.prototype.inc = function increment () {
  this.value++
}

Counter.prototype.dec = function decrement () {
  if (--this.value === 0) this.emit('zero')
}

Counter.prototype.equalZero = function isZero () {
  return (this.value === 0)
}

Counter.prototype.onceZero = function onceZero (fn) {
  if (this.isZero()) return fn()

  this.once('zero', fn)
}

export default Counter
