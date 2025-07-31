import Image from "next/image"
import { Github, Linkedin } from "lucide-react"
import Header from "@/components/header"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function TimKamiPage() {
  const teamMembers = [
    {
      name: "Evan Alif Widhyatma",
      role: "Research Assist",
      image: "https://avatars.githubusercontent.com/u/56740250?v=4",
      github: "https://github.com/evanalif113",
      linkedin: "https://www.linkedin.com/in/evan-alif-widhyatma-5b3a5a1b3/",
    },
    {
      name: "Muhammad Rizal Arfiyan",
      role: "Backend Developer",
      image: "https://avatars.githubusercontent.com/u/19503666?v=4",
      github: "https://github.com/rizalarfiyan",
      linkedin: "https://www.linkedin.com/in/rizalarfiyan/",
    },
    {
      name: "Bagus Alfian Yusuf",
      role: "Software Developer",
      image: "https://avatars.githubusercontent.com/u/59005468?v=4",
      github: "https://github.com/Fiyanz",
      linkedin: "https://www.linkedin.com/in/fiyanz/",
    },
  ]

  return (
    <>
      <Header />
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-center mb-8">Tim Riset</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-64">
                <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
              </div>
              <div className="p-6 text-center">
                <h5 className="text-xl font-semibold mb-1">{member.name}</h5>
                <p className="mb-4">{member.role}</p>
                <div className="flex justify-center gap-4">
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    <Github className="h-4 w-4" /> Github
                  </a>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-transparent text-white bg-blue-600 rounded-md px-4 py-2 hover:bg-blue-700"
                  >
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}
