"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Mic, Sparkles, FileText } from "lucide-react"

export default function DrafterPage() {
  const [prompt, setPrompt] = useState("")
  const [output, setOutput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setOutput(`Based on your requirements, here is a draft document:

---

BAIL APPLICATION

IN THE COURT OF [COURT NAME]

Criminal Case No.: [CASE NUMBER]

In the matter of:
[APPLICANT NAME] ... Applicant/Accused

Versus

State of [STATE NAME] ... Respondent/Prosecution

APPLICATION FOR GRANT OF REGULAR BAIL

Most respectfully showeth:

1. That the applicant is a student with no prior criminal record.

2. That the applicant has been falsely implicated in this case under Section 379 IPC.

3. That the applicant has deep roots in society and is not a flight risk.

4. That the applicant undertakes to cooperate with the investigation and appear before the court as and when required.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Grant regular bail to the applicant in the above case;
(b) Pass any other order as this Hon'ble Court may deem fit and proper in the interest of justice.

---

This is an AI-generated draft. Please review and modify as needed.`)
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <PageHeader
          title="AI Drafter"
          description="Generate legal documents with advanced AI models"
          icon={<Sparkles className="h-6 w-6 text-cyan" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="flex flex-col p-6 rounded-xl bg-card border border-border/50 card-glow">
            <label className="text-sm text-muted-foreground mb-3">Describe your document requirements</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Draft a bail application for a client charged under Section 379 IPC. The client is a student with no prior criminal record..."
              className="flex-1 min-h-[400px] p-4 bg-secondary/50 rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-cyan/50 border border-border/30"
            />
            <div className="flex items-center justify-between mt-4">
              <button className="h-10 w-10 rounded-full bg-secondary/50 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300">
                <Mic className="h-5 w-5" />
              </button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-gradient-to-r from-cyan to-teal text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_oklch(0.72_0.17_195_/_0.3)]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Draft"}
              </Button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex flex-col p-6 rounded-xl bg-card border border-border/50 card-glow">
            <label className="text-sm text-muted-foreground mb-3">Generated Output</label>
            <div className="flex-1 min-h-[400px] p-4 bg-secondary/50 rounded-lg overflow-auto border border-border/30">
              {output ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{output}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-mono text-sm opacity-50">AI output will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
