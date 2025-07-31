"use client"

import { useEffect, useState, type FormEvent } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { useRouter } from "next/navigation"
import {
  getUserProfile,
  signOutUser,
  updateUserProfileData,
  updateUserPassword,
  deleteUserAccount,
  type UserProfile,
} from "@/lib/FetchingAuth"
import { auth } from "@/lib/ConfigFirebase"
import { Timestamp } from "firebase/firestore"
import LoadingSpinner from "@/components/LoadingSpinner"

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Form states
  const [displayName, setDisplayName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // UI states
  const [editStatus, setEditStatus] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        try {
          const profile = await getUserProfile(currentUser.uid)
          if (profile) {
            setUserProfile(profile)
            setDisplayName(profile.displayName)
          } else {
            setError("Could not find user profile.")
          }
        } catch (err) {
          setError("Failed to fetch user profile.")
        }
      } else {
        router.push("/login")
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !userProfile) return
    setEditStatus(null)
    if (displayName === userProfile.displayName) {
      setEditStatus({ message: "No changes to save.", type: "error" })
      return
    }
    try {
      await updateUserProfileData(user.uid, displayName)
      setEditStatus({ message: "Profile updated successfully!", type: "success" })
      setUserProfile((prev) => (prev ? { ...prev, displayName } : null))
    } catch (err: any) {
      setEditStatus({ message: err.message, type: "error" })
    }
  }

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordStatus(null)
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: "Passwords do not match.", type: "error" })
      return
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ message: "Password should be at least 6 characters.", type: "error" })
      return
    }
    try {
      await updateUserPassword(newPassword)
      setPasswordStatus({ message: "Password updated successfully!", type: "success" })
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPasswordStatus({ message: err.message, type: "error" })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    if (window.confirm("Are you sure you want to delete your account? This action is irreversible.")) {
      try {
        await deleteUserAccount()
        router.push("/login?message=Account deleted successfully.")
      } catch (err: any) {
        setDeleteError(err.message)
      }
    }
  }

  const handleSignOut = async () => {
    await signOutUser()
    router.push("/login")
  }

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString()
    }
    return new Date(date).toLocaleDateString()
  }

  const formatDateTime = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString()
    }
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return <LoadingSpinner />
  }
  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>
  }
  if (!user || !userProfile) {
    return null
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-4">
      {/* Profile Info */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Profil Pengguna</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <p><strong>Nama</strong> {userProfile.displayName}</p>
          <p><strong>Email:</strong> {userProfile.email}</p>
          <p><strong>Role:</strong> <span className="rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800">{userProfile.role}</span></p>
          <p><strong>Member since:</strong> {formatDate(userProfile.createdAt)}</p>
          <p><strong>Last login:</strong> {formatDateTime(userProfile.lastLoginAt)}</p>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold">Edit Profil</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          {editStatus && <p className={`text-sm ${editStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>{editStatus.message}</p>}
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Save Changes</button>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label htmlFor="newPassword">New Password</label>
            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          {passwordStatus && <p className={`text-sm ${passwordStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>{passwordStatus.message}</p>}
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Update Password</button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border-2 border-dashed border-red-500 bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-red-600">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Delete this account</p>
            <p className="text-sm text-gray-600">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button onClick={handleDeleteAccount} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">Delete Account</button>
        </div>
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
      </div>

      <button onClick={handleSignOut} className="w-full rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Sign Out</button>
    </div>
  )
}

export default ProfilePage
