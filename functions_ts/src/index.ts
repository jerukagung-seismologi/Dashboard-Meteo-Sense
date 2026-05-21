/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Initialize the Firebase Admin SDK.
// This will automatically use the project's service account credentials
// when deployed to the Firebase environment.
admin.initializeApp();

const db = admin.firestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 5 });

/**
 * A helper function to verify if the calling user is an Admin.
 * Throws an HttpsError if the user is not authenticated or not an admin.
 * @param {string | undefined} uid The UID of the user calling the function.
 */
const ensureIsAdmin = async (uid: string | undefined) => {
  if (!uid) {
    logger.error("Authentication failed: No UID provided.");
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "Admin") {
    logger.warn(`Unauthorized access attempt by UID: ${uid}`);
    throw new HttpsError(
      "permission-denied",
      "This function can only be called by an administrator.",
    );
  }
};

/**
 * [Callable Function] Creates a new user in Firebase Authentication and
 * a corresponding user profile document in Firestore.
 * Can only be executed by an authenticated Admin user.
 */
export const adminCreateUser = onCall(async (request) => {
  // 1. Verify that the calling user is an Admin.
  await ensureIsAdmin(request.auth?.uid);

  // 2. Validate incoming data.
  const { email, password, displayName, role } = request.data;
  if (!email || !password || !displayName || !role) {
    throw new HttpsError(
      "invalid-argument",
      "The 'email', 'password', 'displayName', and 'role' are required.",
    );
  }

  try {
    // 3. Create the user in Firebase Authentication.
    logger.info(`Creating user for email: ${email}`);
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // 4. Set custom claims (like role) for the new user.
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // 5. Create the user profile document in Firestore.
    const userProfile = {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: null,
    };
    await db.collection("users").doc(userRecord.uid).set(userProfile);

    logger.info(`Successfully created user ${userRecord.uid} with role ${role}`);
    return {
      success: true,
      uid: userRecord.uid,
      message: "User created successfully.",
    };
  } catch (error: any) {
    logger.error("Error in adminCreateUser:", error);
    // Provide a more specific error message if possible.
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "The email address is already in use by another account.");
    }
    throw new HttpsError("internal", "An internal error occurred while creating the user.");
  }
});

/**
 * [Callable Function] Deletes a user from Firebase Authentication and
 * their corresponding profile from Firestore.
 * Can only be executed by an authenticated Admin user.
 */
export const adminDeleteUser = onCall(async (request) => {
  // 1. Verify that the calling user is an Admin.
  await ensureIsAdmin(request.auth?.uid);

  // 2. Validate incoming data.
  const { uid: uidToDelete } = request.data;
  if (!uidToDelete) {
    throw new HttpsError("invalid-argument", "The 'uid' of the user to delete is required.");
  }

  // Prevent an admin from deleting their own account through this function.
  if (request.auth?.uid === uidToDelete) {
    throw new HttpsError("permission-denied", "Administrators cannot delete their own accounts using this function.");
  }

  try {
    // 3. Delete the user from Firebase Authentication.
    logger.info(`Attempting to delete user with UID: ${uidToDelete}`);
    await admin.auth().deleteUser(uidToDelete);

    // 4. Delete the user's profile from Firestore.
    await db.collection("users").doc(uidToDelete).delete();

    logger.info(`Successfully deleted user ${uidToDelete}.`);
    return {
      success: true,
      message: "User deleted successfully.",
    };
  } catch (error: any) {
    logger.error(`Error in adminDeleteUser for UID ${uidToDelete}:`, error);
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "The specified user to delete does not exist.");
    }
    throw new HttpsError("internal", "An internal error occurred while deleting the user.");
  }
});
