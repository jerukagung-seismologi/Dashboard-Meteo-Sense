from firebase_functions import https_fn
from firebase_admin import initialize_app, firestore, auth
import logging

# Inisialisasi Firebase Admin SDK dibiarkan di luar (tidak menyebabkan error)
initialize_app()

def ensureIsAdmin(uid: str | None) -> None:
    """
    Fungsi bantuan untuk memverifikasi apakah user yang memanggil adalah Admin.
    """
    if not uid:
        logging.error("Autentikasi gagal: Tidak ada UID yang diberikan.")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Fungsi ini harus dipanggil dalam keadaan login."
        )

    # PINDAHKAN KE SINI: Inisialisasi db dilakukan saat fungsi dieksekusi
    db = firestore.client()
    user_doc = db.collection("users").document(uid).get()
    
    if not user_doc.exists or user_doc.to_dict().get("role") != "Admin":
        logging.warning(f"Upaya akses tidak sah oleh UID: {uid}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Fungsi ini hanya dapat dipanggil oleh administrator."
        )


@https_fn.on_call(max_instances=5)
def adminCreateUser(req: https_fn.CallableRequest) -> dict:
    uid_pemanggil = req.auth.uid if req.auth else None
    ensureIsAdmin(uid_pemanggil)

    data = req.data
    email = data.get("email")
    password = data.get("password")
    display_name = data.get("displayName")
    role = data.get("role")

    if not email or not password or not display_name or not role:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="'email', 'password', 'displayName', dan 'role' wajib diisi."
        )

    try:
        logging.info(f"Membuat user untuk email: {email}")
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )

        auth.set_custom_user_claims(user_record.uid, {"role": role})

        # PINDAHKAN KE SINI: Panggil client Firestore untuk menyimpan data
        db = firestore.client()
        user_profile = {
            "uid": user_record.uid,
            "email": email,
            "displayName": display_name,
            "role": role,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "lastLoginAt": None,
        }
        db.collection("users").document(user_record.uid).set(user_profile)

        return {
            "success": True,
            "uid": user_record.uid,
            "message": "User berhasil dibuat."
        }

    except auth.EmailAlreadyExistsError:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
            message="Alamat email sudah digunakan oleh akun lain."
        )
    except Exception as e:
        logging.error(f"Error dalam adminCreateUser: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Terjadi kesalahan internal saat membuat user."
        )


@https_fn.on_call(max_instances=5)
def adminDeleteUser(req: https_fn.CallableRequest) -> dict:
    uid_pemanggil = req.auth.uid if req.auth else None
    ensureIsAdmin(uid_pemanggil)

    uid_to_delete = req.data.get("uid")
    if not uid_to_delete:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="'uid' dari user yang akan dihapus wajib diisi."
        )

    if uid_pemanggil == uid_to_delete:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Administrator tidak dapat menghapus akunnya sendiri."
        )

    try:
        logging.info(f"Mencoba menghapus user dengan UID: {uid_to_delete}")
        auth.delete_user(uid_to_delete)

        # PINDAHKAN KE SINI: Panggil client Firestore untuk menghapus data
        db = firestore.client()
        db.collection("users").document(uid_to_delete).delete()

        return {
            "success": True,
            "message": "User berhasil dihapus."
        }

    except auth.UserNotFoundError:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="User yang ditentukan untuk dihapus tidak ada."
        )
    except Exception as e:
        logging.error(f"Error dalam adminDeleteUser: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Terjadi kesalahan internal saat menghapus user."
        )