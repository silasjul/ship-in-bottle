import Scene from '@/components/Scene'
import LevaControls from '@/components/LevaControls'
import LoadingScreen from '@/components/LoadingScreen'

export default function Home() {
  return (
    <main className="w-full h-lvh">
      <LevaControls />
      <Scene />
      <LoadingScreen />
    </main>
  )
}
