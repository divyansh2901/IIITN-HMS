import bcrypt from "bcryptjs";
import { PrismaClient, type Role } from "@prisma/client";

const prisma = new PrismaClient();

const roleDefinitions = [
  ["STUDENT", "Student portal access"],
  ["WARDEN", "Hostel administration access"],
  ["GUARD", "Gate and equipment operations"],
  ["STAFF", "Assigned operational work"],
  ["SUPER_ADMIN", "System administration access"]
] as const;

async function main() {
  const roles = new Map<string, Role>();
  for (const [code, description] of roleDefinitions) roles.set(code, await prisma.role.upsert({ where: { code }, update: { description }, create: { code, description } }));
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const createUser = async (email: string, fullName: string, roleCode: string, phone: string) => {
    const user = await prisma.user.upsert({ where: { email }, update: { fullName, passwordHash, phone, status: "ACTIVE" }, create: { email, fullName, passwordHash, phone } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles.get(roleCode)!.id } }, update: {}, create: { userId: user.id, roleId: roles.get(roleCode)!.id } });
    return user;
  };

  const warden = await createUser("warden@iiitn.ac.in", "Ananya Kulkarni", "WARDEN", "9000000001");
  const guard = await createUser("guard@iiitn.ac.in", "Ramesh Patil", "GUARD", "9000000002");
  const admin = await createUser("admin@iiitn.ac.in", "HMS Super Administrator", "SUPER_ADMIN", "9000000003");
  const studentUser = await createUser("bt24cse096@iiitn.ac.in", "Aarav Sharma", "STUDENT", "9000000004");
  const secondStudentUser = await createUser("bt25cs h036@iiitn.ac.in".replace(" ", ""), "Meera Joshi", "STUDENT", "9000000005");

  const student = await prisma.student.upsert({ where: { userId: studentUser.id }, update: {}, create: { userId: studentUser.id, enrollmentNumber: "BT24CSE096", admissionBatch: 2024, branchCode: "CSE", academicYear: 3, guardianName: "Sanjay Sharma", guardianPhone: "9000000014" } });
  const secondStudent = await prisma.student.upsert({ where: { userId: secondStudentUser.id }, update: {}, create: { userId: secondStudentUser.id, enrollmentNumber: "BT25CSH036", admissionBatch: 2025, branchCode: "CSH", academicYear: 2, guardianName: "Nisha Joshi", guardianPhone: "9000000015" } });
  await prisma.staff.upsert({ where: { userId: guard.id }, update: { designation: "Gate Guard", department: "Hostel Operations" }, create: { userId: guard.id, designation: "Gate Guard", department: "Hostel Operations" } });
  await prisma.staff.upsert({ where: { userId: warden.id }, update: { designation: "Hostel Warden", department: "Hostel Administration" }, create: { userId: warden.id, designation: "Hostel Warden", department: "Hostel Administration" } });
  await prisma.staff.upsert({ where: { userId: admin.id }, update: { designation: "System Administrator", department: "IT Services" }, create: { userId: admin.id, designation: "System Administrator", department: "IT Services" } });

  const floorDescriptions: Record<number, string> = {
    0: "Mess, night canteen, shop, barber shop, hostel office, and gate guard",
    1: "Usual arrangement: girls from all academic years",
    2: "Usual arrangement: primarily first-year boys",
    3: "Usual arrangement: primarily first-year boys",
    4: "Usual arrangement: primarily second-year boys; cardio and legs facility",
    5: "Usual arrangement: primarily second-year boys; gym facility",
    6: "Usual arrangement: primarily third-year boys",
    7: "Usual arrangement: primarily third-year boys",
    8: "Usual arrangement: primarily third-year boys; table tennis hall",
    9: "Usual arrangement: primarily fourth-year boys; reading room",
    10: "Usual arrangement: primarily fourth-year boys"
  };
  const floors = new Map<number, string>();
  for (let number = 0; number <= 10; number++) {
    const floor = await prisma.floor.upsert({ where: { number }, update: { description: floorDescriptions[number], isActive: true }, create: { number, name: number === 0 ? "Ground Floor" : `${number}${number === 1 ? "st" : number === 2 ? "nd" : number === 3 ? "rd" : "th"} Floor`, description: floorDescriptions[number] } });
    floors.set(number, floor.id);
  }
  const roomA = await prisma.room.upsert({ where: { floorId_roomNumber: { floorId: floors.get(2)!, roomNumber: "201" } }, update: {}, create: { floorId: floors.get(2)!, roomNumber: "201", roomType: "FOUR_SEATER", capacity: 4 } });
  await prisma.room.upsert({ where: { floorId_roomNumber: { floorId: floors.get(2)!, roomNumber: "202" } }, update: {}, create: { floorId: floors.get(2)!, roomNumber: "202", roomType: "FOUR_SEATER", capacity: 4 } });
  await prisma.room.upsert({ where: { floorId_roomNumber: { floorId: floors.get(5)!, roomNumber: "501" } }, update: {}, create: { floorId: floors.get(5)!, roomNumber: "501", roomType: "DOUBLE", capacity: 2 } });
  await prisma.room.upsert({ where: { floorId_roomNumber: { floorId: floors.get(9)!, roomNumber: "901" } }, update: {}, create: { floorId: floors.get(9)!, roomNumber: "901", roomType: "DOUBLE", capacity: 2 } });
  if (!await prisma.roomAllocation.findFirst({ where: { studentId: student.id, status: "ACTIVE" } })) await prisma.roomAllocation.create({ data: { roomId: roomA.id, studentId: student.id, allocatedBy: warden.id } });

  await prisma.hostelApplication.upsert({ where: { studentId: secondStudent.id }, update: {}, create: { studentId: secondStudent.id } });
  for (const name of ["Cleaning", "Electrical", "Plumbing", "Furniture", "Other"]) await prisma.complaintCategory.upsert({ where: { name }, update: { isActive: true }, create: { name } });
  for (const item of [{ name: "Football", totalQuantity: 10 }, { name: "Badminton Racket", totalQuantity: 12 }, { name: "Table Tennis Paddle", totalQuantity: 8 }]) await prisma.equipment.upsert({ where: { name: item.name }, update: { totalQuantity: item.totalQuantity }, create: { ...item, availableQuantity: item.totalQuantity } });
  await prisma.policySetting.upsert({ where: { key: "HOSTEL_IN_TIME" }, update: { value: "22:00" }, create: { key: "HOSTEL_IN_TIME", value: "22:00", description: "Usual hostel in-time; configurable by authorized administrators." } });
  const notice = await prisma.notice.findFirst({ where: { title: "Welcome to IIITN HMS" } });
  if (!notice) await prisma.notice.create({ data: { title: "Welcome to IIITN HMS", body: "This development environment contains synthetic hostel records. Contact the hostel office for official policies.", isPublished: true, publishedAt: new Date(), authorId: warden.id } });
  console.log("Seed complete. Development passwords are documented in README.md.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
