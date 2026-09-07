import { useNavigate } from "@tanstack/react-router"
import { EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Shown when navigating straight to a view whose module is switched off. */
export function ModuleDisabled({ view, slug }: { view: string; slug: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            {view} is not enabled
          </CardTitle>
          <CardDescription>
            This feature is not enabled on this project — try selecting another view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate({ to: "/projects/$slug", params: { slug } })}>
            Back to project overview
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
