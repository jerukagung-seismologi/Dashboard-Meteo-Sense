"use client"

import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { type Container, type ISourceOptions } from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"
import { useTheme } from "next-themes"

const ParticleBackground = () => {
  const [init, setInit] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false) // wait for theme to mount

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

  const particlesLoaded = async (_container?: Container): Promise<void> => {
    // Particles loaded
  }

  const isDark = resolvedTheme === "dark"

  const options: ISourceOptions = useMemo(
    () => ({
      background: { 
        color: { 
          value: "transparent" 
        } 
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { 
            enable: true, 
            mode: "grab" 
          },
        },
        modes: {
          grab: {
            distance: 140,
            links: { opacity: 0.6 },
          },
        },
      },
      particles: {
        color: { 
          value: isDark ? "#ffffff" : "#000000" 
        }, // strict white/black
        links: {
          color: isDark ? "#ffffff" : "#000000",          // strict white/black
          distance: 150,
          enable: true,
          opacity: 0.35,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "out" },
          random: false,
          speed: 0.8,
          straight: false,
        },
        number: {
          density: { 
            enable: true 
          },
          value: 80,
        },
        opacity: { 
          value: 0.6 
        },
        shape: { 
          type: "circle" 
        },
        size: { 
          value: { 
            min: 1, 
            max: 2 
          } 
        },
      },
      detectRetina: true,
    }),
    [isDark],
  )

  // Avoid SSR hydration mismatch and render only after init + mounted
  if (!init || !mounted) return null

  return (
    <Particles
      key={isDark ? "dark" : "light"} // force re-init on theme change
      id="tsparticles"
      particlesLoaded={particlesLoaded}
      options={options}
      className="absolute inset-0 z-10"
    />
  )
}

export default ParticleBackground
