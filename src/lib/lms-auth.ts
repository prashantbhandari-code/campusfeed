import prisma from "./prisma";

// LMS authorization helper.
//
// Course roles come from three places: User.role ("admin"), Course.createdBy
// (the teacher who created the course), and CourseEnrollment.role
// ("teaching_assistant", status "active"). Routes previously checked none of
// these — any authenticated user could create courses, forge attendance, or
// attach assignments to arbitrary modules.

export interface CourseMembership {
  isAdmin: boolean;
  isTeacher: boolean; // creator of the course
  isTA: boolean; // active teaching_assistant enrollment
  isEnrolled: boolean; // active enrollment (student or TA)
  courseExists: boolean;
}

export async function getCourseMembership(
  courseId: string,
  userId: string
): Promise<CourseMembership> {
  const [user, course, enrollment] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { createdBy: true } }),
    prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: userId } },
      select: { role: true, status: true },
    }),
  ]);
  const active = enrollment?.status === "active";
  return {
    isAdmin: user?.role === "admin",
    isTeacher: course?.createdBy === userId,
    isTA: active && enrollment?.role === "teaching_assistant",
    isEnrolled: active,
    courseExists: course !== null,
  };
}

// Full mutation rights over course structure: modules, assignments, quizzes,
// attendance marking, grades.
export function canManageCourse(m: CourseMembership): boolean {
  return m.isAdmin || m.isTeacher;
}

// Read/participate rights: course detail, materials, quizzes, forum.
export function canParticipateInCourse(m: CourseMembership): boolean {
  return m.isAdmin || m.isTeacher || m.isTA || m.isEnrolled;
}
