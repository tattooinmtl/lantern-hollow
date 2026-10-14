import { createFileRoute } from "@tanstack/react-router"
import { LanternApp } from "@/components/lantern-app"

export const Route = createFileRoute("/")({ component: LanternApp })
