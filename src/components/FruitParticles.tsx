import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { loadImageShape } from "@tsparticles/shape-image";

const fruitPreload = [
  { src: "https://particles.js.org/images/fruits/apple.png", name: "apple", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/avocado.png", name: "avocado", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/banana.png", name: "banana", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/berries.png", name: "berries", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/cherry.png", name: "cherry", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/grapes.png", name: "grapes", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/lemon.png", name: "lemon", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/orange.png", name: "orange", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/peach.png", name: "peach", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/pear.png", name: "pear", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/pepper.png", name: "pepper", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/plum.png", name: "plum", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/star.png", name: "star", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/strawberry.png", name: "strawberry", width: 32, height: 32, gif: false },
  { src: "https://particles.js.org/images/fruits/watermelon.png", name: "watermelon", width: 32, height: 32, gif: false },
  {
    src: "https://particles.js.org/images/fruits/watermelon_slice.png",
    name: "watermelon_slice",
    width: 32,
    height: 32,
    gif: false
  }
] as const;

export default function FruitParticles() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async engine => {
      await loadSlim(engine);
      await loadImageShape(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(
    () => ({
      autoPlay: true,
      background: {
        opacity: 1,
        color: {
          value: "transparent"
        }
      },
      fullScreen: {
        enable: false,
        zIndex: 0
      },
      detectRetina: true,
      fpsLimit: 120,
      interactivity: {
        detectsOn: "window" as const,
        events: {
          onHover: {
            enable: true,
            mode: "bubble" as const
          },
          onClick: {
            enable: true,
            mode: "push" as const
          },
          resize: {
            enable: true,
            delay: 0.5
          }
        },
        modes: {
          bubble: {
            distance: 400,
            duration: 2,
            opacity: 0.8,
            size: 20,
            mix: false
          },
          push: {
            quantity: 4,
            default: true
          }
        }
      },
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            width: 1920,
            height: 1080
          }
        },
        move: {
          enable: true,
          speed: 1,
          direction: "none" as const,
          random: false,
          straight: false,
          outModes: {
            default: "out" as const
          }
        },
        opacity: {
          value: 1
        },
        rotate: {
          value: {
            min: 0,
            max: 360
          },
          animation: {
            enable: true,
            speed: 5,
            sync: false
          },
          direction: "random" as const
        },
        shape: {
          type: "image" as const,
          options: {
            image: fruitPreload.map(image => ({ name: image.name }))
          }
        },
        size: {
          value: 15
        }
      },
      preload: fruitPreload,
      pauseOnBlur: true,
      pauseOnOutsideViewport: true
    }),
    []
  );

  if (!ready) {
    return null;
  }

  return <Particles id="login-fruit-particles" className="h-full w-full" options={options} />;
}
