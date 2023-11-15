import {useEffect, useRef, useState} from 'react'

export const Particles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fps, setFPS] = useState(0)
  useEffect(() => {
    if (canvasRef.current) {
      new ParticleState(
        canvasRef.current,
        {
          density: 8,
          size: [1, 2],
          speed: 0.5,
          wander: 1,
          cursor: 20,
          fps: 60,
          color: 'rgba(255,255,255,0.5)',
        },
        setFPS,
      )
    }
  }, [])
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'black',
      }}
    >
      <div
        style={{
          padding: '0px 2px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.6)',
          color: 'greenyellow',
          fontFamily: 'monospace',
          fontSize: 18,
          boxShadow: '0 0 2px rgba(255, 255, 255, 0.25)',
          position: 'absolute',
          top: 12,
          right: 12,
          minWidth: 28,
          textAlign: 'center',
        }}
      >
        {fps}
      </div>
      <canvas
        ref={canvasRef}
        style={{width: '100%', height: '100%', zIndex: 10}}
      />
    </div>
  )
}

type Particle = {
  x: number
  y: number
  origin: [number, number]
  size: number
  direction: [number, number]
}

type ParticleConfig = {
  density: number
  size: number | [number, number]
  speed: number
  wander: number
  cursor: number
  fps: number
  color: string
}

type SafeConfig = {
  density: number
  size: [number, number]
  speed: number
  wander: number
  cursor: number
  fps: number
  frameLength: number
  color: string
}

class PushQueue {
  private queue: number[]
  private cursor = 0
  constructor(length: number) {
    this.queue = Array(length)
  }

  public push(item: number) {
    this.queue[this.cursor++] = item
    this.cursor %= this.queue.length
  }

  public avg() {
    console.log(this.queue)
    return Math.round(
      this.queue.reduce((total, val) => total + val, 0) / this.queue.length,
    )
  }
}

class ParticleState {
  public constructor(
    private canvas: HTMLCanvasElement,
    config: ParticleConfig,
    onUpdateFPS: (fps: number) => void,
  ) {
    this.config = this.formatConfig(config)
    this.updateFPS = onUpdateFPS
    this.updateCanvasSize(canvas.clientWidth, canvas.clientHeight)
    this.watchCursorPosition()
    this.watchSizeChange()
    this.ctx = canvas.getContext('2d')!
    this.paint()
  }

  private particles: Particle[] = []
  private ctx: CanvasRenderingContext2D
  private cursorPosition?: [number, number]
  private lastPaint = 0
  private config: SafeConfig
  private updateFPS: (fps: number) => void
  private fprQueue = new PushQueue(10)

  private paint() {
    requestAnimationFrame(timestamp => {
      const stepSize = timestamp - this.lastPaint
      if (stepSize < this.config.frameLength) {
        this.paint()
        return
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.beginPath()
      for (const particle of this.particles) {
        this.drawParticle(particle, stepSize)
      }
      this.ctx.closePath()
      this.ctx.fillStyle = this.config.color
      this.ctx.fill()

      this.fprQueue.push(Math.round(1000 / stepSize))
      this.updateFPS(this.fprQueue.avg())
      this.lastPaint = timestamp
      this.paint()
    })
  }

  private drawParticle(particle: Particle, stepSize: number) {
    this.ctx.moveTo(particle.x, particle.y)
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2, false)
    this.updateParticlePosition(particle, stepSize)
  }
  private formatConfig(config: ParticleConfig): SafeConfig {
    return {
      ...config,
      frameLength: 1000 / config.fps,
      size:
        typeof config.size === 'number'
          ? [config.size, config.size]
          : config.size,
    }
  }

  private watchSizeChange() {
    const observer = new ResizeObserver(() => {
      this.updateCanvasSize(this.canvas.clientWidth, this.canvas.clientHeight)
    })
    observer.observe(this.canvas)
  }

  private watchCursorPosition() {
    this.canvas.addEventListener('mousemove', ev => {
      this.cursorPosition = [ev.offsetX, ev.offsetY]
    })
    this.canvas.addEventListener('mouseleave', () => {
      this.cursorPosition = undefined
    })
  }

  private updateCanvasSize(width: number, height: number) {
    this.canvas.height = height
    this.canvas.width = width
    this.generateParticles()
  }

  private generateParticles() {
    this.particles = []
    for (let x = 0; x < this.canvas.width; x += this.config.density) {
      for (let y = 0; y < this.canvas.height; y += this.config.density) {
        this.particles.push({
          x:
            x +
            randNumberInRange([
              -this.config.density / 2,
              this.config.density / 2,
            ]),
          y:
            y +
            randNumberInRange([
              -this.config.density / 2,
              this.config.density / 2,
            ]),
          direction: [
            randNumberInRange([-10, 10]) / 100,
            randNumberInRange([-10, 10]) / 100,
          ],
          size: randNumberInRange(this.config.size) / 2,
          origin: [x, y],
        })
      }
    }
  }

  private updateParticlePosition(particle: Particle, stepSize: number) {
    particle.x += Math.round(particle.direction[0] * this.config.speed)
    particle.y += Math.round(particle.direction[1] * this.config.speed)
    const distanceFromOriginX = particle.origin[0] - particle.x
    const distanceFromOriginY = particle.origin[1] - particle.y
    particle.direction[0] +=
      (randNumberInRange([-10, 10]) +
        distanceFromOriginX / this.config.wander) /
      100
    particle.direction[1] +=
      (randNumberInRange([-10, 10]) +
        distanceFromOriginY / this.config.wander) /
      100
    if (this.cursorPosition) {
      const distanceFromCursorX = particle.x - this.cursorPosition[0]
      const distanceFromCursorY = particle.y - this.cursorPosition[1]
      if (
        Math.abs(distanceFromCursorX) <= this.config.cursor * 2 &&
        Math.abs(distanceFromCursorY) <= this.config.cursor * 2
      ) {
        particle.direction[0] += this.config.cursor / distanceFromCursorX
        particle.direction[1] += this.config.cursor / distanceFromCursorY
      }
    }
  }
}

const randNumberInRange = (range: [number, number]) => {
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
}
