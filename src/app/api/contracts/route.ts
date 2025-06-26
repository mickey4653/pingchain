import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { contactId, terms, frequency, startDate, endDate } = await req.json()

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        contactId,
        userId: session.user.id,
        terms,
        frequency,
        startDate,
        endDate,
      },
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (contactId) {
      where.contactId = contactId
    }

    // Get contracts
    const contracts = await prisma.contract.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        contact: true,
      },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Contract API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id, ...data } = await req.json()

    // Verify contract exists and belongs to user
    const contract = await prisma.contract.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!contract) {
      return new NextResponse('Contract not found', { status: 404 })
    }

    // Update contract
    const updatedContract = await prisma.contract.update({
      where: {
        id,
      },
      data,
    })

    return NextResponse.json(updatedContract)
  } catch (error) {
    console.error('Contract API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return new NextResponse('Contract ID is required', { status: 400 })
    }

    // Verify contract exists and belongs to user
    const contract = await prisma.contract.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!contract) {
      return new NextResponse('Contract not found', { status: 404 })
    }

    // Delete contract
    await prisma.contract.delete({
      where: {
        id,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Contract API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 